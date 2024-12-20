import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilePlus, X } from 'lucide-react';

interface InputFileProps {
  onFileSelect: (file: File) => void;
}

export function InputFile({ onFileSelect }: InputFileProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFile(null);
    onFileSelect(null as any);
  };

  return (
    <div className="space-y-4">
      <Label
        htmlFor="file"
        className="flex items-center space-x-4 rounded-md border p-4 cursor-pointer relative"
      >
        <FilePlus />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none">
            {selectedFile ? selectedFile.name : 'Upload a file'}
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedFile
              ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
              : 'Upload a sermon to give context to the chat.'}
          </p>
          <Input
            id="file"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
          />
        </div>
        {selectedFile && (
          <button
            onClick={handleClear}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Clear file selection"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </Label>
    </div>
  );
}
