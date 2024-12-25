import { NextResponse } from 'next/server';
import { OpenAIEmbeddings } from '@langchain/openai';

import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { ProcessingRecord } from '@/types/processingRecord';

function splitIntoSentences(text: string): string[] {
  const exceptions = ['Mr.', 'Mrs.', 'Dr.', 'Ph.D.', 'e.g.', 'i.e.', 'etc.', 'vs.', 'Rev.'];
  let workingText = text;
  
  // Temporarily replace exceptions
  exceptions.forEach((exc, i) => {
    workingText = workingText.replace(new RegExp(`\\b${exc}\\b`, 'g'), `##${i}##`);
  });
  
  // Split on sentence boundaries
  const sentences = workingText.match(/[^.!?]+(?:[.!?]+|$)/g) || [];
  
  // Restore exceptions
  return sentences.map(sentence => {
    exceptions.forEach((exc, i) => {
      sentence = sentence.replace(new RegExp(`##${i}##`, 'g'), exc);
    });
    return sentence.trim();
  });
}

function createChunks(sentences: string[], maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let processingRecord: ProcessingRecord | null = null;

  try {
    const supabase = createServerSupabaseClient();
    
    // Get the processing record
    const { data: record, error } = await supabase
      .from('sermon_processing')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: 'Processing record not found' }, { status: 404 });
    }

    processingRecord = record;

    if (processingRecord?.status !== 'parsed') {
      return NextResponse.json({ 
        error: `Invalid state for vectorization. Current state: ${processingRecord?.status}`, 
        currentStatus: processingRecord?.status 
      }, { status: 400 });
    }

    const sentences = splitIntoSentences(processingRecord.text);
    const chunks = createChunks(sentences);

    // Create embeddings
    const embeddings = new OpenAIEmbeddings();
    
    // Process chunks and create vector embeddings
    const chunkData = await Promise.all(
      chunks.map(async (chunk, index) => {
        const embedding = await embeddings.embedQuery(chunk);
        return {
          sermon_id: processingRecord!.sermon_id,
          content: chunk,
          embedding,
          chunk_index: index,
          chunk_type: 'content' // You might want to detect different types
        };
      })
    );

    // Store chunks with embeddings
    const { error: insertError } = await supabase
      .from('sermon_chunks')
      .insert(chunkData);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // Update processing record status and clear text
    await supabase
      .from('sermon_processing')
      .update({ 
        status: 'vectorized',
      })
      .eq('id', id);

    return NextResponse.json({ 
      processingId: id,
      sermonId: processingRecord.sermon_id,
      status: 'vectorized',
      chunkCount: chunks.length,
      nextStep: 'store'
    });

  } catch (error) {
    console.error('Vectorization error:', error);
    
    if (processingRecord) {
      try {
        const supabase = createServerSupabaseClient();
        await supabase
          .from('sermon_processing')
          .update({ 
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Vectorization failed'
          })
          .eq('id', id);
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

    return NextResponse.json({ 
      error: 'Failed to vectorize sermon',
      step: 'vectorize'
    }, { status: 500 });
  }
}
