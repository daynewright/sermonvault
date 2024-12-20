'use client';

import { AvatarDropdown } from '@/components/avatar-dropdown';
import { InputFile } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Brain, FilePlus, NotebookPen } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { data: session } = useSession();
  const { email, image, name } = session?.user || {};

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleUpload = () => {
    console.log('Uploading file:', uploadedFile);
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
    }, 3000);
  };

  return (
    <div>
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex-1 flex items-center gap-2 font-medium text-xl">
            <NotebookPen className="w-6 h-6" />
            SermonVault
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="mr-4">
                <FilePlus className="w-4 h-4 mr-2" />
                Upload a sermon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] md:max-w-[800px] h-[500px] flex flex-col">
              <DialogTitle className="text-xl font-semibold">
                Upload a sermon
              </DialogTitle>
              <DialogDescription className="mt-2 mb-4">
                Adding a sermon will help the AI understand your context. You
                only have to upload it once and the AI will be able to use it
                for future searches. Once added you can ask questions about the
                sermon.
              </DialogDescription>
              {isUploading ? (
                <div className="flex-1 overflow-y-auto">
                  <p className="text-center">
                    {'AI is reading your sermon...'
                      .split('')
                      .map((letter, index) => (
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
          <AvatarDropdown email={email} image={image} name={name} />
        </div>
      </div>
      {children}
    </div>
  );
};

export default ChatLayout;
