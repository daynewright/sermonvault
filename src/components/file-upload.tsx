import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notebook } from 'lucide-react';

export function InputFile() {
  return (
    <Label
      htmlFor="file"
      className="flex items-center space-x-4 rounded-md border p-4 cursor-pointer"
    >
      <Notebook />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">Upload a file</p>
        <p className="text-sm text-muted-foreground">
          Upload a sermon to give context to the chat.
        </p>
        <Input id="file" type="file" className="hidden" />
      </div>
    </Label>
  );
}
