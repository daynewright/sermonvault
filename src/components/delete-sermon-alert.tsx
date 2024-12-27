import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

import { useDeleteSermon } from '@/hooks/fetch/use-sermon';
import { useSermons } from '@/hooks/fetch/use-sermons';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DeleteSermonAlertProps {
  title?: string;
  sermonId?: string;
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export const DeleteSermonAlert = ({
  title,
  sermonId,
  open,
  onCancel,
  onSuccess,
}: DeleteSermonAlertProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const { mutateAsync: deleteSermon } = useDeleteSermon();
  const { refetch: refetchSermons } = useSermons();

  const handleDeleteSermon = async (sermonId: string) => {
    setIsDeleting(true);
    try {
      await deleteSermon(sermonId);
      toast({
        description: 'Sermon deleted successfully',
      });
      onSuccess?.();
      refetchSermons();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete sermon',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;
            {title}
            &quot; and it will no longer be searchable with AI.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 hover:bg-red-600"
            onClick={() => sermonId && handleDeleteSermon(sermonId)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
