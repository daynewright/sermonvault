import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function processFile(file: File) {
  try {
    // Load and parse PDF directly from File
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    const text = docs.map((doc) => doc.pageContent).join(' ');

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitText(text);

    // Get embedding for first chunk only (for testing)
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks[0],
    });

    return {
      success: true,
      sample: {
        chunk: chunks[0],
        embedding: embedding.data[0].embedding.slice(0, 5), // Just first 5 values
        totalChunks: chunks.length,
        embeddingLength: embedding.data[0].embedding.length,
        totalPages: docs.length,
      },
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    const result = await processFile(file);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}
