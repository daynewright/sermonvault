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
    // Generate a single sermon ID for all chunks
    const sermonId = randomUUID();

    // Load and parse PDF
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    const text = docs.map((doc) => doc.pageContent).join(' ');

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitText(text);

    // Get embeddings for all chunks
    const embeddings = await Promise.all(
      chunks.map(chunk => 
        openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        })
      )
    );

    // Prepare documents for storage
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
    }));

    return { documents, sermonId };
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
    const { documents, sermonId } = await processFile(file, user.id);

    // Store documents in Supabase
    const { data, error } = await supabase
      .from('documents')
      .insert(documents)
      .select();

    if (error) {
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
