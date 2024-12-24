import { useState } from 'react';
import { DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { InputFile } from './file-upload';
import { useToast } from '@/hooks/use-toast';
import { SermonData } from '@/types/sermonData';
import { CheckIcon, XCircleIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

const processingSteps = [
  { id: 'upload', label: 'Uploading file...' },
  { id: 'parse', label: 'Looking over sermon content...' },
  { id: 'vectorize', label: 'Splitting up for better search...' },
  { id: 'store', label: 'Storing the sermon file...' },
] as const;

type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error';

type UploadSermonFileProcessProps = {
  setSermonData: (data: SermonData) => void;
};

export const UploadSermonFileProcess = ({
  setSermonData,
}: UploadSermonFileProcessProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [processingStatus, setProcessingStatus] = useState<
    Record<string, ProcessingStatus>
  >({});
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    // Validate file type and size
    if (uploadedFile.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
      });
      return;
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum file size is 8MB',
      });
      return;
    }

    setIsUploading(true);
    setProcessingStatus({});

    try {
      // Step 1: Upload
      setCurrentStep('upload');
      const formData = new FormData();
      formData.append('file', uploadedFile);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      setProcessingStatus((prev) => ({ ...prev, upload: 'completed' }));

      const { processingId } = await response.json();

      // Step 2: Parse
      setCurrentStep('parse');
      const parseResponse = await fetch(
        `/api/process-sermon/${processingId}/parse`,
        {
          method: 'POST',
        }
      );
      if (!parseResponse.ok) throw new Error('Parsing failed');
      // Get the sermon id from the parse response
      const { sermonId } = await parseResponse.json();
      setProcessingStatus((prev) => ({ ...prev, parse: 'completed' }));

      // Step 3: Vectorize
      setCurrentStep('vectorize');
      const vectorizeResponse = await fetch(
        `/api/process-sermon/${processingId}/vectorize`,
        {
          method: 'POST',
        }
      );
      if (!vectorizeResponse.ok) throw new Error('Vectorization failed');
      setProcessingStatus((prev) => ({ ...prev, vectorize: 'completed' }));

      // Step 4: Store
      setCurrentStep('store');

      const storeResponse = await fetch(
        `/api/process-sermon/${processingId}/store`,
        {
          method: 'POST',
          body: formData,
        }
      );
      if (!storeResponse.ok) throw new Error('Storage failed');
      setProcessingStatus((prev) => ({ ...prev, store: 'completed' }));

      // Get the final sermon data
      const sermonResponse = await fetch(`/api/sermons/${sermonId}`);
      const sermonData = await sermonResponse.json();
      setSermonData(sermonData);
    } catch (error) {
      // Mark current step as error
      setProcessingStatus((prev) => ({ ...prev, [currentStep]: 'error' }));
      toast({
        variant: 'destructive',
        title:
          error instanceof Error ? error.message : 'Failed to process sermon',
        description: uploadedFile.name,
      });
    } finally {
      setIsUploading(false);
      setCurrentStep('');
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
        <div className="flex-1 overflow-y-auto space-y-4">
          {processingSteps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {processingStatus[step.id] === 'completed' ? (
                <CheckIcon className="h-5 w-5 text-green-500" />
              ) : processingStatus[step.id] === 'error' ? (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              ) : currentStep === step.id ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="h-5 w-5" /> // Empty placeholder for alignment
              )}
              <span
                className={cn(
                  'text-sm',
                  processingStatus[step.id] === 'completed' &&
                    'text-muted-foreground',
                  processingStatus[step.id] === 'error' && 'text-red-500',
                  currentStep === step.id && 'text-primary font-medium'
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <InputFile onFileSelect={handleFileSelect} />
        </div>
      )}
      {uploadedFile && !isUploading && (
        <Button className="mt-4" onClick={handleUpload} disabled={isUploading}>
          Upload selected file
        </Button>
      )}
    </>
  );
};
