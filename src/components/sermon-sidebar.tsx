'use client';

import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Sermon = {
  id: string;
  filename: string;
  uploadedAt: string;
  pageCount: number;
};

export function SermonSidebar() {
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useUser();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sermonToDelete, setSermonToDelete] = useState<Sermon | null>(null);

  useEffect(() => {
    fetchSermons();
  }, [user, isUserLoading]);

  const fetchSermons = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/sermons');
      if (!response.ok) throw new Error('Failed to fetch sermons');
      const data = await response.json();
      setSermons(data);
    } catch (err) {
      console.error('Error fetching sermons:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load sermons',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sermon: Sermon) => {
    setSermonToDelete(null);
    setDeletingId(sermon.id);

    try {
      const response = await fetch(`/api/sermons/${sermon.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete sermon');

      setSermons(sermons.filter((s) => s.id !== sermon.id));
      toast({
        description: 'Sermon deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting sermon:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete sermon',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isUserLoading) {
    return (
      <div className="w-64 border-r h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-64 border-r h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Please sign in</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'border-r h-[calc(100vh-4rem)] flex flex-col transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="p-4 border-b flex justify-between items-center">
          {!isCollapsed && <h2 className="font-semibold">Sermons</h2>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : sermons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isCollapsed ? 'Empty' : 'No sermons found'}
              </p>
            ) : (
              sermons.map((sermon) => (
                <div
                  key={sermon.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent group max-w-[230px]"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  {!isCollapsed && (
                    <>
                      <div className="text-sm truncate flex-1">
                        {sermon.filename} ({sermon.pageCount} pages)
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSermonToDelete(sermon);
                        }}
                        disabled={deletingId === sermon.id}
                      >
                        {deletingId === sermon.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <AlertDialog
        open={!!sermonToDelete}
        onOpenChange={() => setSermonToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{sermonToDelete?.filename}" and it
              will no longer be searchable with AI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => sermonToDelete && handleDelete(sermonToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
