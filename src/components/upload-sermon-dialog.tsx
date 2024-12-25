import { useState } from 'react';
import { FilePlus } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

import { UploadSermonFileProcess } from '@/components/upload-sermon-file-process';
import { UploadSermonConfirmationForm } from '@/components/upload-sermon-confirmation-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';

import { SermonData } from '@/types/sermonData';

type UploadSermonDialogProps = {
  buttonVariant?: ButtonProps['variant'];
};

export function UploadSermonDialog({ buttonVariant }: UploadSermonDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sermonData, setSermonData] = useState<SermonData | null>(null);
  const isMobile = useIsMobile();

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={isMobile ? 'icon' : 'sm'}>
          <FilePlus className="w-4 h-4" />
          {!isMobile && 'Upload a sermon'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] min-h-[500px] max-h-[90vh] flex flex-col">
        <div className="flex-1 overflow-y-auto pr-6 pl-2">
          {!sermonData && (
            <UploadSermonFileProcess setSermonData={setSermonData} />
          )}
          {sermonData && (
            <UploadSermonConfirmationForm
              setDialogOpen={setDialogOpen}
              initialData={sermonData}
              onSubmit={(data) => {
                // Handle the submission here
                console.log('Submitted data:', data);
                setSermonData(null);
                setDialogOpen(false);
                toast({
                  title: 'Sermon updated successfully',
                  description:
                    'Your sermon has been updated and is ready to be reviewed.',
                });
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
