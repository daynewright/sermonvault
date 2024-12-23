import { useState, useEffect } from 'react';
import { FilePlus } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InputFile } from '@/components/file-upload';
import { useToast } from '@/hooks/use-toast';
import { useSermonsStore } from '@/store/use-sermons-store';

const processingPhrases = [
  'AI is reading your sermon...',
  'Analyzing the content...',
  'Extracting key points...',
  'Processing scripture references...',
  'Determining the tone...',
  'Extracting themes...',
  'Extracting calls to action...',
  'Extracting personal stories...',
  'Extracting mentioned people...',
  'Extracting mentioned events...',
  'Extracting engagement tags...',
  'Extracting keywords...',
  'Almost done...',
];

export function UploadSermonDialog({
  buttonVariant,
}: {
  buttonVariant?: ButtonProps['variant'];
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [phraseIndex, setPhraseIndex] = useState(0);

  const refreshSermons = useSermonsStore((state) => state.refreshSermons);

  useEffect(() => {
    if (!isUploading) return;

    const interval = setInterval(() => {
      setPhraseIndex((current) =>
        current < processingPhrases.length - 1 ? current + 1 : current
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isUploading]);

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;
    setPhraseIndex(0);
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setIsUploading(false);
        setUploadedFile(null);
        setDialogOpen(false);
        toast({
          title: 'Sermon added to AI successfully!',
          description: uploadedFile?.name,
        });
        refreshSermons();
      } else {
        setIsUploading(false);
        setUploadedFile(null);
        const errorData = await response.json();
        toast({
          variant: 'destructive',
          title: errorData.error || 'Failed to add sermon to AI',
          description: uploadedFile?.name,
        });
      }
    } catch (error) {
      setIsUploading(false);
      setUploadedFile(null);
      toast({
        variant: 'destructive',
        title:
          error instanceof Error ? error.message : 'Failed to add sermon to AI',
        description: uploadedFile?.name,
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm">
          <FilePlus className="w-4 h-4 mr-2" />
          Upload a sermon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] h-[500px] flex flex-col">
        <DialogTitle className="text-xl font-semibold">
          Upload a sermon
        </DialogTitle>
        <DialogDescription className="mt-2 mb-4">
          Adding your sermons will allow the AI to answer any questions about
          them. You only have to upload it once and the AI will be able to use
          it for future searches. Once added you can ask questions about the
          sermon. If you decide to delete a sermon, it will be removed from the
          AI&apos;s memory.
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
          <Button
            className="mt-4"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload selected file'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
