import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    console.log('Received message:', message);
    
    // Get current user
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.log('User ID:', user.id);

    // Generate embedding for the user's question
    console.log('Generating embedding for:', message);
    const { data: embedding } = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });

    // Search with much lower threshold
    console.log('Searching for relevant content');
    const { data: documents, error: searchError } = await supabase.rpc(
      'match_documents',
      {
        query_embedding: embedding[0].embedding,
        match_threshold: 0.1,    // Much lower threshold
        match_count: 15,         // More results
        p_user_id: user.id
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    console.log('Found documents:', documents?.length || 0);

    // Sort documents by similarity and format context
    const context = documents
      ?.sort((a: any, b: any) => b.similarity - a.similarity)
      ?.map((doc: any) => `[Similarity: ${doc.similarity.toFixed(2)}]\n${doc.content}`)
      .join('\n\n---\n\n');

    console.log('Context length:', context?.length || 0);

    // Send to ChatGPT with better prompt
    console.log('Sending to ChatGPT');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions about sermons. 
          Use the provided sermon context to answer questions accurately. 
          Focus on the most relevant parts (higher similarity scores).
          If asked about main points, structure your response clearly.
          If the context doesn't contain relevant information, say so.
          You are able to answer questions about the Bible.
          
          Context from sermons (sorted by relevance):\n\n${context}`
        },
        { role: 'user', content: message }
      ],
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
