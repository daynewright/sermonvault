import { OpenAI } from 'openai';
import { ChatOpenAI } from '@langchain/openai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, messages } = await req.json();
    
    // Limit conversation history
    const limitedMessages = messages
      .slice(-5) // Keep only last 5 messages
      .filter((msg: any) => {
        // Optionally filter out messages that are too long
        return msg.content.length <= 500;
      });

    // Get current user
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize the classifier model
    const classifier = new ChatOpenAI({ 
      modelName: 'gpt-3.5-turbo',
      temperature: 0, // Keep it deterministic
    });

    // Check if context is needed
    const classifierResponse = await classifier.invoke([
      {
        role: 'system',
        content: `Determine if this question requires specific sermon context to answer accurately.
        Respond with only "true" or "false".
        Examples:
        - "What does the Bible say about love?" -> false (general question)
        - "What was the main point of last week's sermon?" -> true (needs context)
        - "Can you explain John 3:16?" -> false (general biblical question)
        - "What did the pastor say about forgiveness?" -> true (needs context)`
      },
      {
        role: 'user',
        content: message
      }
    ]);

    const contextNeeded = String(classifierResponse.content || '').toLowerCase().includes('true');

    console.log('Context needed:', contextNeeded);

    // Initialize the main chat model
    const chat = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
    });

    if (!contextNeeded) {
      const stream = await chat.stream([
        { 
          role: 'system', 
          content: 'You are a helpful sermon assistant knowledgeable about theology and the Bible. Respond in a way that is helpful to the user, cheerful and friendly. Refer to yourself as a sermon assistant.' 
        },
        ...limitedMessages,
        { role: 'user', content: message }
      ]);

      // Create a readable stream that converts AIMessageChunks to strings
      const readableStream = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            controller.enqueue(chunk.content);
          }
          controller.close();
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Generate embedding for the user's question
    const { data: embedding } = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });

    // Search with slightly higher threshold and fewer results
    const { data: documents, error: searchError } = await supabase.rpc(
      'match_documents',
      {
        query_embedding: embedding[0].embedding,
        match_threshold: 0.3,  // Increased from 0.1
        match_count: 5,        // Reduced from 10
        p_user_id: user.id
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    console.log('Found documents:', documents?.length || 0);

    // Sort documents by similarity and format context with limits
    let context = documents
      ?.sort((a: any, b: any) => b.similarity - a.similarity)
      ?.slice(0, 3)  // Take only top 3 most relevant
      ?.map((doc: any) => `[Similarity: ${doc.similarity.toFixed(2)}]\n${doc.content}`)
      .join('\n\n---\n\n');

    // Limit context length if too long
    if (context?.length > 4000) {
      context = context.slice(0, 4000) + '...';
    }

    console.log('Context length:', context?.length || 0);

    const systemPrompt = `You are a helpful sermon assistant knowledgeable about theology and the Bible with deep knowledge of the user's sermons. 
    You have access to and have analyzed their sermon content. Use this knowledge to provide accurate, 
    detailed responses about their sermons. Always respond in a natural, conversational way.
    
    Here is the relevant sermon content you've analyzed:
    ${context}
    
    Remember to:
    - Use markdown when appropriate and bold important information
    - ALWAYS mention the sermon title and date in your response if known
    - Speak confidently about the sermon content you know
    - Don't mention embeddings, documents, or similarity scores
    - If you're not sure about something, say so naturally without referring to missing documents
    - Keep responses focused on the sermon content you know about`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...limitedMessages,
        { role: "user", content: message }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      stream: true,
    });

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        for await (const part of completion) {
          const text = part.choices[0]?.delta?.content || '';
          controller.enqueue(text);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
