import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { getOpenAIClient } from '@/app/api/lib/clients/openai';

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
    const classifier = new ChatOpenAI({ 
      modelName: 'gpt-3.5-turbo',
      temperature: 0,
    });

    // Check if the question needs sermon context
    const classifierResponse = await classifier.invoke(
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

    const needsContext = classifierResponse.content === "NEEDS_CONTEXT";

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

    // Check if this is an analytical query
    const isAnalyticalQuery = message.toLowerCase().match(/how (many|often)|frequency|pattern|when.*last.*|history/);

    // 2. Regular Chat with Context
    if (!isAnalyticalQuery) {
      // Generate embedding for regular chat
      const { data: embedding } = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: message,
      });

      // Regular search with normal threshold
      const { data: documents, error: searchError } = await supabase.rpc(
        'match_documents',
        {
          query_embedding: embedding[0].embedding,
          match_threshold: 0.3,
          match_count: 5,
          p_user_id: user.id
        }
      );

      if (searchError) {
        console.error('Search error:', searchError);
        throw searchError;
      }

      // Get sermon metadata for context
      const sermonIds = [...new Set(documents?.map((doc: any) => doc.sermon_id))];
      const { data: sermons } = await supabase
        .from('sermons')
        .select('*')
        .in('id', sermonIds);

      // Format context for regular chat
      const context = documents
        ?.sort((a: any, b: any) => b.similarity - a.similarity)
        ?.map((doc: any) => {
          const sermon = sermons?.find(s => s.id === doc.sermon_id);
          return `[Sermon: "${sermon?.title}" (${sermon?.date}) Content: ${doc.content}]`;
        })
        .join('\n\n');

      const stream = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a helpful sermon assistant. Use the following sermon content to answer questions: ${context}`
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

    // 3. Analytical Queries
    const { data: embedding } = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });

    // Get potentially relevant documents with higher recall
    const { data: documents, error: searchError } = await supabase.rpc(
      'match_documents',
      {
        query_embedding: embedding[0].embedding,
        match_threshold: 0.2,
        match_count: 30,
        p_user_id: user.id
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    // Get unique sermon IDs and fetch sermon metadata
    const sermonIds = [...new Set(documents?.map((doc: any) => doc.sermon_id))];
    const { data: matchingSermons, error: sermonsError } = await supabase
      .from('sermons')
      .select('*')
      .in('id', sermonIds);

    if (sermonsError) {
      console.error('Sermons fetch error:', sermonsError);
      throw sermonsError;
    }

    // Process in batches and get final analysis
    const analysis = await analyzeInBatches(documents, matchingSermons, message);
    return createStreamingResponse(analysis);

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Helper functions for batch processing
function formatBatchContext(documents: any[], sermons: any[]) {
  return documents
    .map(doc => {
      const sermon = sermons.find(s => s.id === doc.sermon_id);
      return `[Sermon: "${sermon?.title}" (${sermon?.date})
Scripture: ${sermon?.key_scriptures || 'Not specified'}
Summary: ${sermon?.summary || 'Not available'}
Similarity: ${doc.similarity.toFixed(2)}
Content: ${doc.content}]`;
    })
    .join('\n\n---\n\n');
}

async function analyzeInBatches(documents: any[], matchingSermons: any[], question: string) {
  const BATCH_SIZE = 5;
  const finalSummary = [];
  const openai = getOpenAIClient();
  
  // Process documents in batches
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batchDocs = documents.slice(i, i + BATCH_SIZE);
    const batchContext = formatBatchContext(batchDocs, matchingSermons);
    
    const batchResponse = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are analyzing sermon content and metadata to find specific patterns and information.
          
          Available metadata for each sermon:
          - Title
          - Date
          - Key Scriptures
          - Summary
          - Full Content
          
          For any type of query, focus on:
          1. Exact matches (scriptures, words, phrases)
          2. Related concepts and themes
          3. Context of how the topic appears
          4. Relevance to the query (high, medium, low)
          
          Output in JSON format with structure: {
            "matches": [{
              "date": "",
              "title": "",
              "key_scriptures": [],
              "relevance": "high|medium|low",
              "match_type": "primary|secondary|mentioned",
              "context": "",
              "supporting_quotes": []
            }],
            "count": 0,
            "metadata_summary": {
              "date_range": "",
              "common_themes": [],
              "related_topics": []
            }
          }`
        },
        { role: "user", content: `Analyze these sermons regarding: ${question}\n\nContent: ${batchContext}` }
      ],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
      temperature: 0
    });

    const batchResults = JSON.parse(batchResponse.choices[0].message.content || '{}');
    finalSummary.push(batchResults);
  }

  // Final conversational summary
  return await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a friendly sermon assistant helping a pastor understand patterns in their preaching.
        
        Core instructions:
        1. Be conversational and warm in tone
        2. Reference specific sermons and dates naturally
        3. Keep responses clear and organized
        4. Bold important references
        5. Use spacing for readability
        
        Structure your response:
        1. Direct answer to their question first
        2. Supporting details and examples
        3. Any interesting patterns you noticed
        4. Brief conclusion or suggestion if relevant
        
        Remember to:
        - Use natural transitions
        - Keep technical details simple
        - Be encouraging and helpful
        - Stay focused on their specific question`
      },
      { role: "user", content: `Have a friendly conversation about these sermon analysis findings: ${JSON.stringify(finalSummary)}` }
    ],
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    stream: true,
  });
}