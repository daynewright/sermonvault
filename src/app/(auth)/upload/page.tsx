'use client';
import { useState } from 'react';
import { InputFile } from '@/components/file-upload';

export function TestUpload() {
  const [status, setStatus] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setStatus('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`Success! Processed ${data.totalPages} pages`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  return (
    <div className="space-y-4">
      <InputFile onFileSelect={handleFileSelect} />
      {status && <div className="text-sm mt-2">Status: {status}</div>}
    </div>
  );
}

export default function TestPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test ChromaDB Upload</h1>
      <TestUpload />
    </div>
  );
}
