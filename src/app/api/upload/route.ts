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

async function processFile(file: File, userId: string) {
  try {
    // Generate IDs and filenames
    const sermonId = randomUUID();
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}-${file.name.replace(/\s+/g, '_')}`;

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. First, upload the file to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('sermons')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 2. Process PDF content
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    const text = docs.map((doc) => doc.pageContent).join(' ');

    // 3. Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitText(text);

    // 4. Get embeddings for all chunks
    const embeddings = await Promise.all(
      chunks.map(chunk => {
        return openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        });
      })
    );

    // 5. Prepare documents for storage with file information
    const documents = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index].data[0].embedding,
      sermon_id: sermonId,
      metadata: {
        filename: file.name,
        pageCount: docs.length,
        chunkIndex: index,
        uploadedAt: new Date().toISOString(),
      },
      user_id: userId,
      file_path: fileName,
      file_name: file.name,
      file_size: file.size
    }));

    return { documents, sermonId, fileName };
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

    // Process the file and get documents with embeddings
    const { documents, sermonId, fileName } = await processFile(file, user.id);

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
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}
