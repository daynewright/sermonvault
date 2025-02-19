'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/fetch/use-user';
import { useSermonsStore } from '@/store/use-sermons-store';
import { useSermons } from '@/hooks/fetch/use-sermons';
import { DeleteSermonAlert } from '@/components/delete-sermon-alert';

import {
  FileText,
  Trash2,
  Loader2,
  CalendarIcon,
  MapPinIcon,
  BookOpen,
  Search,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from './ui/sidebar';

type Sermon = {
  id: string;
  pageCount: number;
  title: string;
  preacher: string;
  date: string;
  location: string;
  filePath: string;
  uploadedAt: string;
};

export function SermonSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { toast } = useToast();
  const { data: user, isLoading: isUserLoading } = useUser();
  const [sermonToDelete, setSermonToDelete] = useState<Sermon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();

  const setSermonCount = useSermonsStore((state) => state.setSermonCount);
  const { data: sermons = [], isLoading, error } = useSermons();

  if (error) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to load sermons',
    });
  }

  useEffect(() => {
    setSermonCount(sermons.length);
  }, [sermons]);

  const filteredSermons = useMemo(() => {
    if (!searchQuery.trim()) return sermons;

    return sermons.filter(
      (sermon: Sermon) =>
        sermon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sermon.preacher.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sermons, searchQuery]);

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
    <Sidebar {...props}>
      <SidebarHeader className="p-4 border-b flex justify-between items-center">
        <div className="text-sm font-medium">
          Sermons ({filteredSermons.length})
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <ScrollArea className="flex-1">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search sermons..."
                  className="h-8 w-full pl-7 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : filteredSermons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sermons found
                </p>
              ) : (
                filteredSermons.map((sermon: Sermon) => (
                  <Popover key={sermon.id}>
                    <PopoverTrigger asChild>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent group max-w-full cursor-pointer">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="text-sm truncate flex-1 max-w-[150px]">
                          {sermon.title}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSermonToDelete(sermon);
                          }}
                          disabled={sermonToDelete?.id === sermon.id}
                        >
                          {sermonToDelete?.id === sermon.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
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
                            {sermon.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            by {sermon.preacher}
                          </p>
                        </div>

                        <div className="space-y-1">
                          {sermon.date && (
                            <div className="flex items-center gap-2 text-xs">
                              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {new Date(sermon.date).toLocaleDateString(
                                  undefined,
                                  {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  }
                                )}
                              </span>
                            </div>
                          )}
                          {sermon.location && (
                            <div className="flex items-center gap-2 text-xs">
                              <MapPinIcon className="h-3 w-3 text-muted-foreground" />
                              <span>{sermon.location}</span>
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
                                {new Date(
                                  sermon.uploadedAt
                                ).toLocaleDateString()}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px] text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    router.push(`/sermons/${sermon.id}`);
                                  }}
                                >
                                  View Sermon
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
        </SidebarGroup>
      </SidebarContent>
      <DeleteSermonAlert
        open={!!sermonToDelete}
        title={sermonToDelete?.title}
        sermonId={sermonToDelete?.id}
        onCancel={() => setSermonToDelete(null)}
        onSuccess={() => {
          setSermonToDelete(null);
        }}
      />
    </Sidebar>
  );
}
