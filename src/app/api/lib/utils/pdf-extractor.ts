import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    const fullText = docs.map(doc => doc.pageContent).join(' ');
    
    // Clean up the text
    return fullText
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n')  // Replace multiple newlines with double newline
      .trim();  // Remove leading/trailing whitespace

  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
} 