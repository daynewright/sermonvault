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
  CalendarIcon,
  MapPinIcon,
  BookOpen,
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
import { useSermonsStore } from '@/store/use-sermons-store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type Sermon = {
  id: string;
  pageCount: number;
  metadata: {
    title: string;
    preacher: string;
    date: string;
    location: string;
  };
  filePath: string;
  uploadedAt: string;
};

export function SermonSidebar() {
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useUser();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sermonToDelete, setSermonToDelete] = useState<Sermon | null>(null);

  const refreshCounter = useSermonsStore((state) => state.refreshCounter);
  const setSermonCount = useSermonsStore((state) => state.setSermonCount);
  const loadingSermons = useSermonsStore((state) => state.loadingSermons);
  const setLoadingSermons = useSermonsStore((state) => state.setLoadingSermons);

  useEffect(() => {
    fetchSermons();
  }, [user, isUserLoading, refreshCounter]);

  useEffect(() => {
    setSermonCount(sermons.length);
  }, [sermons]);

  const fetchSermons = async () => {
    if (!user) return;
    setLoadingSermons(true);

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
      setLoadingSermons(false);
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
          {!isCollapsed && (
            <h2 className="font-semibold">Sermons ({sermons.length})</h2>
          )}
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
            {loadingSermons ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : sermons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isCollapsed ? 'Empty' : 'No sermons found'}
              </p>
            ) : (
              sermons.map((sermon) => (
                <Popover key={sermon.id}>
                  <PopoverTrigger asChild>
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent group max-w-[230px] cursor-pointer">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      {!isCollapsed && (
                        <>
                          <div className="text-sm truncate flex-1">
                            {sermon.metadata.title}
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
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80"
                    align="start"
                    sideOffset={5}
                    alignOffset={20}
                  >
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h4 className="text-xs font-semibold leading-none mb-1">
                          {sermon.metadata.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          by {sermon.metadata.preacher}
                        </p>
                      </div>

                      <div className="space-y-1">
                        {sermon.metadata.date && (
                          <div className="flex items-center gap-2 text-xs">
                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {new Date(
                                sermon.metadata.date
                              ).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        {sermon.metadata.location && (
                          <div className="flex items-center gap-2 text-xs">
                            <MapPinIcon className="h-3 w-3 text-muted-foreground" />
                            <span>{sermon.metadata.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          <span>{sermon.pageCount} pages</span>
                        </div>
                      </div>

                      <div className="border-t pt-2 mt-1">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span>
                              Added{' '}
                              {new Date(sermon.uploadedAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => {}}
                              >
                                View File
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSermonToDelete(sermon);
                                }}
                              >
                                Delete Sermon
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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
              This will permanently delete &quot;
              {sermonToDelete?.metadata.title}
              &quot; and it will no longer be searchable with AI.
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
