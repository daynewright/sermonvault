import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { randomUUID } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { extractSermonMetadata } from '@/lib/utils/sermon-parser';
import { getOpenAIClient } from '@/lib/clients/openai';

export async function processSermonUpload(
  supabase: SupabaseClient,
  file: File,
  userId: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.full_name || 'Unknown Preacher';
  
  const sermonId = randomUUID();
  const fileName = `${userId}/${sermonId}/${file.name.replace(/\s+/g, '_')}`;

  try {
    // 1. Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('sermons')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // 2. Process PDF content
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    
    const fullText = docs.map(doc => doc.pageContent).join(' ');
    
    // 3. Extract metadata using AI
    const extractedMetadata = await extractSermonMetadata(fullText);
    
    // Format the date properly
    const today = new Date().toISOString().split('T')[0];
    let sermonDate = today;

    if (extractedMetadata.date) {
      const parsedDate = new Date(extractedMetadata.date);
      if (!isNaN(parsedDate.getTime())) {
        sermonDate = parsedDate.toISOString().split('T')[0];
      }
    }

    // Store both the metadata and confidence scores
    const metadata = {
      title: extractedMetadata.title || 'Untitled Sermon',
      date: sermonDate,
      series: extractedMetadata.series || null,
      primary_scripture: extractedMetadata.primary_scripture || null,
      scriptures: extractedMetadata.scriptures || [],
      sermon_type: extractedMetadata.sermon_type || 'expository',
      topics: extractedMetadata.topics || [],
      tags: extractedMetadata.tags || [],
      summary: extractedMetadata.summary || 'No summary available',
      key_points: extractedMetadata.key_points || [],
      illustrations: extractedMetadata.illustrations || [],
      preacher: extractedMetadata.preacher || userName,
      location: extractedMetadata.location || 'Unknown Location'
    };

    // 4. Create sermon record with confidence scores
    const { error: sermonError } = await supabase
      .from('sermons')
      .insert({
        id: sermonId,
        ...metadata,
        confidence_scores: extractedMetadata.confidence || {},  // Store confidence scores
        file_path: fileName,
        file_type: file.type,
        file_name: file.name,
        file_size: file.size,
        user_id: userId
      })
      .select()
      .single();

    console.log('Metadata and confidence scores:', { 
      metadata, 
      confidence: extractedMetadata.confidence 
    });

    if (sermonError) {
      console.error('Sermon record creation error:', sermonError);
      throw sermonError;
    }

    // 5. Create and store chunks with embeddings
    console.log('Starting chunk creation and embedding');
    const chunks = await createSermonChunks(supabase, fullText, sermonId);
    console.log('Chunks created:', { count: chunks.length });
    
    return {
      success: true,
      sermon: metadata,
      chunkCount: chunks.length
    };

  } catch (error) {
    console.error('Sermon processing error:', error);
    // Cleanup on failure
    await supabase.storage.from('sermons').remove([fileName]);
    throw error;
  }
}

async function createSermonChunks(supabase: SupabaseClient, text: string, sermonId: string) {
  const openai = getOpenAIClient();
  console.log('Starting chunk creation for sermon:', sermonId);
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitText(text);
  console.log('Text split into chunks:', { count: chunks.length });
  
  // Process chunks in batches to avoid rate limits
  const batchSize = 5;
  const processedChunks = [];

  try {
    for (let i = 0; i < chunks.length; i += batchSize) {
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(chunks.length/batchSize)}`);
      const batch = chunks.slice(i, i + batchSize);

      const embeddingPromises = batch.map(async (chunk, index) => {
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        });

        return {
          sermon_id: sermonId,
          content: chunk,
          chunk_type: 'content',
          embedding: embedding.data[0].embedding,
          chunk_index: i + index
        };
      });

      const processedBatch = await Promise.all(embeddingPromises);
      processedChunks.push(...processedBatch);
      console.log(`Batch ${Math.floor(i/batchSize) + 1} processed, total chunks:`, processedChunks.length);

      // Save each batch to the database
      const { error: insertError } = await supabase
        .from('sermon_chunks')
        .insert(processedBatch);

      if (insertError) {
        console.error('Error inserting chunks:', insertError);
        throw insertError;
      }

      console.log(`Saved batch ${Math.floor(i/batchSize) + 1} to database`);
    }

    return processedChunks;

  } catch (error) {
    console.error('Error in chunk processing:', error);
    throw error;
  }
} 