import { useEffect, useState } from 'react';
import { DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { InputFile } from './file-upload';
import { useToast } from '@/hooks/use-toast';
import { SermonData } from '@/types/sermonData';

const processingPhrases = [
  'AI is reading your sermon...',
  'Analyzing the content...',
  'Extracting key points...',
  'Processing scripture references...',
  'Determining the tone...',
  'Creating AI understanding...',
  'Organizing content...',
  'Finalizing upload...',
];

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

type UploadSermonFileProcessProps = {
  setSermonData: (data: SermonData) => void;
};

export const UploadSermonFileProcess = ({
  setSermonData,
}: UploadSermonFileProcessProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isUploading) return;

    const interval = setInterval(() => {
      setPhraseIndex((current) =>
        current < processingPhrases.length - 1 ? current + 1 : current
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isUploading]);

  const processSermon = async (processingId: string, file: File) => {
    try {
      // Step 2: Parse metadata
      const parseResponse = await fetch(
        `/api/process-sermon/${processingId}/parse`,
        {
          method: 'POST',
        }
      );

      if (!parseResponse.ok) {
        const error = await parseResponse.json();
        throw new Error(error.error || 'Parsing failed');
      }

      const { sermonId } = await parseResponse.json();

      // Step 3: Create vectors
      const vectorizeResponse = await fetch(
        `/api/process-sermon/${processingId}/vectorize`,
        {
          method: 'POST',
        }
      );

      if (!vectorizeResponse.ok) {
        const error = await vectorizeResponse.json();
        throw new Error(error.error || 'Vectorization failed');
      }

      // Step 4: Final storage
      const storeFormData = new FormData();
      storeFormData.append('file', file);

      const storeResponse = await fetch(
        `/api/process-sermon/${processingId}/store`,
        {
          method: 'POST',
          body: storeFormData,
        }
      );

      if (!storeResponse.ok) {
        const error = await storeResponse.json();
        throw new Error(error.error || 'Storage failed');
      }

      return sermonId;
    } catch (error) {
      console.error('Processing error:', error);
      throw error;
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    if (uploadedFile.size > MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `Maximum size is 8MB. ${uploadedFile.name} is ${(
          uploadedFile.size /
          1024 /
          1024
        ).toFixed(1)}MB`,
      });
      return;
    }

    setPhraseIndex(0);
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      // Step 1: Initial upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { processingId } = await response.json();

      // Process through remaining steps
      const sermonId = await processSermon(processingId, uploadedFile);

      // Get the final sermon data
      const sermonResponse = await fetch(`/api/sermons/${sermonId}`);
      if (!sermonResponse.ok) {
        throw new Error('Failed to fetch sermon data');
      }

      const sermonData = await sermonResponse.json();
      setSermonData(sermonData);

      toast({
        title: 'Sermon added successfully!',
        description: uploadedFile.name,
      });
    } catch (error) {
      setIsUploading(false);
      setUploadedFile(null);
      toast({
        variant: 'destructive',
        title:
          error instanceof Error ? error.message : 'Failed to process sermon',
        description: uploadedFile.name,
      });
    }
  };

  return (
    <>
      <DialogTitle className="text-xl font-semibold">
        Upload a sermon
      </DialogTitle>
      <DialogDescription className="mt-2 mb-4 text-sm text-muted-foreground">
        Adding your sermons will allow the AI to answer any questions about
        them. You only have to upload it once and the AI will be able to use it
        for future searches. Once added you can ask questions about the sermon.
        If you decide to delete a sermon, it will be removed from the AI&apos;s
        memory.
      </DialogDescription>
      {isUploading ? (
        <div className="flex-1 overflow-y-auto">
          <p className="text-center">
            {processingPhrases[phraseIndex].split('').map((letter, index) => (
              <span
                key={index}
                className="inline-block animate-pulse"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationDuration: '1s',
                  marginLeft: letter === ' ' ? '0.25em' : '0.02em',
                }}
              >
                {letter}
              </span>
            ))}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <InputFile onFileSelect={handleFileSelect} />
        </div>
      )}
      {uploadedFile && (
        <Button className="mt-4" onClick={handleUpload} disabled={isUploading}>
          {isUploading ? 'Processing...' : 'Upload selected file'}
        </Button>
      )}
    </>
  );
};
