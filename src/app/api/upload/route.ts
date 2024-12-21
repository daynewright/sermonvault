import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractMetadata(text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Extract sermon metadata from the provided text. 
        Return ONLY a JSON object with these fields:
        - title: The sermon title
        - preacher: The preacher's name
        - date: The sermon date (strictly in YYYY-MM-DD format, e.g., "2024-03-21". If date format is unclear, return null)
        - location: The church/location where preached
        Include a confidence score (0-1) for each field.
        If a field is not found, use null.`
      },
      {
        role: "user",
        content: `Extract metadata from this sermon text:\n\n${text.substring(0, 2000)}`
      }
    ],
    temperature: 0,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

async function processFile(file: File, userId: string) {
  try {
    const sermonId = randomUUID();
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}-${file.name.replace(/\s+/g, '_')}`;

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Upload file first
    const { error: uploadError } = await supabase
      .storage
      .from('sermons')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Process PDF content
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    const firstPageText = docs[0].pageContent;
    
    // Get AI-extracted metadata
    const extractedMetadata = await extractMetadata(firstPageText);

    // Simplify metadata handling - just use extracted metadata
    const finalMetadata = {
      title: extractedMetadata.title || 'Untitled Sermon',
      preacher: extractedMetadata.preacher || 'Unknown Preacher',
      date: extractedMetadata.date || null,
      location: extractedMetadata.location || null,
      extracted: extractedMetadata,
    };

    // Optional: Validate required fields
    if (!finalMetadata.title || !finalMetadata.preacher || !finalMetadata.date) {
      throw new Error('Missing required metadata fields');
    }

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const text = docs.map((doc) => doc.pageContent).join(' ');
    const chunks = await splitter.splitText(text);

    // Get embeddings for all chunks
    const embeddings = await Promise.all(
      chunks.map(chunk => {
        const textForEmbedding = `Title: ${finalMetadata.title}
Preacher: ${finalMetadata.preacher}
Date: ${finalMetadata.date}${finalMetadata.location ? `\nLocation: ${finalMetadata.location}` : ''}
Content: ${chunk}`.trim();

        return openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textForEmbedding,
        });
      })
    );

    // Prepare documents for storage
    const documents = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index].data[0].embedding,
      sermon_id: sermonId,
      user_id: userId,
      file_path: fileName,
      file_name: file.name,
      file_size: file.size,
      // Metadata fields
      title: finalMetadata.title,
      preacher: finalMetadata.preacher,
      sermon_date: finalMetadata.date ? new Date(finalMetadata.date).toISOString() : null,
      location: finalMetadata.location,
      metadata_confidence: extractedMetadata.confidence,
      // Additional metadata
      metadata: {
        extracted: extractedMetadata,
        pageCount: docs.length,
        chunkIndex: index,
        uploadedAt: new Date().toISOString(),
      }
    }));

    return { 
      documents, 
      sermonId, 
      fileName,
      metadata: finalMetadata 
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Process the file - removed user metadata
    const { documents, sermonId, fileName, metadata } = await processFile(file, user.id);

    // Store documents in Supabase
    const { error } = await supabase
      .from('documents')
      .insert(documents)
      .select();

    if (error) {
      // If database insert fails, clean up the uploaded file
      await supabase
        .storage
        .from('sermons')
        .remove([fileName]);

      console.error('Supabase storage error:', error);
      return NextResponse.json(
        { error: 'Failed to store documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentsStored: documents.length,
      sermonId: sermonId,
      filename: file.name,
      filePath: fileName,
      firstChunk: documents[0].content.slice(0, 100) + '...',
      metadata: metadata
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}
