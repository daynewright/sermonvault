import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { getOpenAIClient } from '@/app/api/lib/clients/openai';
import { functionHandlers } from '@/app/api/lib/chat/function-handlers';
import { classifySermonQuery } from '@/app/api/lib/chat/sermon-classifier';

// Helper function to create standardized streaming response
const createStreamingResponse = async (stream: any) => {
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(content);
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
};

export async function POST(req: Request) {
  const openai = getOpenAIClient();
  const supabase = createServerSupabaseClient();
  
  try {
    const { message, messages } = await req.json();
    
    // Limit conversation history
    const limitedMessages = messages
      .slice(-5)
      .filter((msg: any) => msg.content.length <= 500);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize the classifier model
    const checkContext = new ChatOpenAI({ 
      modelName: 'gpt-3.5-turbo',
      temperature: 0,
    });

    // Check if the question needs sermon context
    const checkContextResponse = await checkContext.invoke(
      `Determine if this question requires searching through sermon content or if it's a general question.

      Questions that NEED_CONTEXT:
      - "What did Pastor John say about marriage last month?"
      - "Which sermon talked about the prodigal son?"
      - "When was the last time you covered Revelation?"
      - "What are the key points from recent sermons about prayer?"
      - "How many times have you preached on forgiveness?"

      Questions that DON'T need context (NO_CONTEXT):
      - "What does the Bible say about marriage?"
      - "Can you explain the story of the prodigal son?"
      - "How should I pray?"
      - "What is the meaning of forgiveness in Christianity?"
      - "What are the basic principles of faith?"

      Rules:
      1. If the question references specific sermons, pastors, or past teachings → NEEDS_CONTEXT
      2. If the question asks about frequency, patterns, or history → NEEDS_CONTEXT
      3. If the question is about general biblical or theological topics → NO_CONTEXT
      4. If in doubt, prefer NEEDS_CONTEXT for better accuracy

      Question: "${message}"
      
      Reply with only "NEEDS_CONTEXT" or "NO_CONTEXT".`
    );

    const needsContext = checkContextResponse.content === "NEEDS_CONTEXT";

    // 1. No Context Required
    if (!needsContext) {
      const stream = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a helpful pastoral assistant. 
            Answer general questions about ministry, theology, and church leadership without referencing specific sermons.
            
            Be direct and helpful in your responses.
            Do not start with "Hello" or "How can I assist you?"
            Instead, answer the question directly while maintaining a warm, cheerful, and professional tone.`
          },
          ...limitedMessages,
          { role: "user", content: message }
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        stream: true,
      });

      return createStreamingResponse(stream);
    }

    // 2. Try to use function handlers first
    let functionResult = [];
    try {
      const classification = await classifySermonQuery(message, openai);

      if (classification.function && classification.function in functionHandlers) {
        const handler = functionHandlers[classification.function];

        if (typeof handler !== 'function') {
          console.log('Handler type:', typeof handler);
          throw new Error(`Handler ${classification.function} is not a function`);
        }
        
        functionResult = await handler({
          supabase,
          userId: user.id,
          parameters: classification.parameters
        });
        
        if (!functionResult || functionResult.length === 0) {
          console.log('Function returned no results, will combine with embedding search');
        }
      }
    } catch (functionError) {
      console.log('Function handling failed:', functionError);
    }

    const embeddingInput = `${message}. Find content about this person, including mentions, quotes, or references.`;

    const { data: embedding } = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingInput,
    });

    
    // Execute query with lower threshold
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding[0].embedding,
      match_threshold: 0.2,  // Lower threshold to catch more matches
      match_count: 25,
      p_user_id: user.id
    });


    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // Get unique sermon IDs and fetch sermon metadata
    const sermonIds = [...new Set(data?.map((doc: any) => doc.sermon_id))];
    const { data: matchingSermons, error: sermonsError } = await supabase
      .from('sermons')
      .select('*')
      .in('id', sermonIds);

    if (sermonsError) {
      console.error('Sermons fetch error:', sermonsError);
      throw sermonsError;
    }

    // Format context for regular chat
    const context = data
      ?.sort((a: any, b: any) => b.similarity - a.similarity)
      ?.map((doc: any) => {
        const sermon = matchingSermons?.find(s => s.id === doc.sermon_id);
        return `[Sermon: id: ${sermon?.id} title: "${sermon?.title}" date: ${sermon?.date} Content: ${doc.content}]`;
      })
      .join('\n\n');

    // Combine function results with embedding results
    const stream = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a helpful sermon assistant. Use the following data to answer questions:
          
Function Analysis: ${JSON.stringify(functionResult)}

Relevant Sermon Content: ${context}

First, provide your analysis in a clear, conversational way.
Then, end your response with a list of all referenced sermons in this format:
SERMONS_START [{"id": [sermon-id], "title": [sermon-title]}] SERMONS_END
Use markdown formatting to make the response more readable.`
        },
        ...limitedMessages,
        { role: "user", content: message }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      stream: true,
    });

    return createStreamingResponse(stream);

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}