import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { ChromaClient } from 'chromadb';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { OpenAIEmbeddings } from '@langchain/openai';

// Initialize ChromaDB client
const client = new ChromaClient({
  path: process.env.CHROMA_DB_PATH || 'http://localhost:8000',
});

async function processFile(file: File, userEmail: string) {
  // Determine file type and use appropriate loader
  let text = '';
  if (file.type === 'application/pdf') {
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    text = docs.map((doc) => doc.pageContent).join(' ');
  } else if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const loader = new DocxLoader(file);
    const docs = await loader.load();
    text = docs.map((doc) => doc.pageContent).join(' ');
  } else {
    // For plain text files
    text = await file.text();
  }

  // Split text into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitText(text);

  // Generate embeddings using OpenAI
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Create user-specific collection
  let collection;
  try {
    collection = await client.getOrCreateCollection({
      name: `sermons_${userEmail.replace('@', '_at_')}`, // Sanitize email for collection name
      metadata: {
        'hnsw:space': 'cosine',
        userEmail: userEmail, // Add user email to metadata
      },
    });
  } catch (error) {
    console.error('ChromaDB collection error:', error);
    throw error;
  }

  // Add documents to ChromaDB
  const documentIds = chunks.map((_, i) => `${file.name}-chunk-${i}`);
  const embeddingVectors = await Promise.all(
    chunks.map((chunk) => embeddings.embedQuery(chunk))
  );

  await collection.add({
    ids: documentIds,
    embeddings: embeddingVectors,
    documents: chunks,
    metadatas: chunks.map(() => ({
      source: file.name,
      userEmail: userEmail,
    })),
  });

  return { success: true, chunksProcessed: chunks.length };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await processFile(file, session.user.email);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}
