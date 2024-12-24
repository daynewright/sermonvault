import { NextResponse } from 'next/server';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { ProcessingRecord } from '@/types/processingRecord';

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

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.createDocuments([processingRecord.text]);
    
    // Create embeddings
    const embeddings = new OpenAIEmbeddings();
    
    // Process chunks and create vector embeddings
    const chunkData = await Promise.all(
      chunks.map(async (chunk, index) => {
        const embedding = await embeddings.embedQuery(chunk.pageContent);
        return {
          sermon_id: processingRecord!.sermon_id,
          content: chunk.pageContent,
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
