'use client';

import { useSermon } from '@/hooks/fetch/use-sermon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CalendarIcon,
  BookOpenIcon,
  UserIcon,
  MapPinIcon,
  ArrowLeft,
  TagIcon,
  ListIcon,
  MessageCircleIcon,
  UsersIcon,
  CalendarDaysIcon,
  FileTextIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { PDFViewer } from '@/components/pdf-viewer';
import { useIsMobile } from '@/hooks/use-mobile';

interface SermonViewProps {
  id: string;
}

// Sermon type colors (modern, complementary)
const sermonTypeColors = {
  expository: 'bg-blue-700 text-white hover:bg-blue-800',
  topical: 'bg-slate-700 text-white hover:bg-slate-800',
  textual: 'bg-indigo-700 text-white hover:bg-indigo-800',
  narrative: 'bg-zinc-700 text-white hover:bg-zinc-800',
  special: 'bg-stone-700 text-white hover:bg-stone-800',
} as const;

export function SermonView({ id }: SermonViewProps) {
  const router = useRouter();
  const { data: sermon, isLoading } = useSermon(id);
  const isMobile = useIsMobile();

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!sermon) {
    return <div className="p-6">Sermon not found</div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-none p-6 bg-background border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">View Sermon</h1>
        </div>
      </div>

      <ResizablePanelGroup
        direction={isMobile ? 'vertical' : 'horizontal'}
        className="flex-1 overflow-hidden"
      >
        <ResizablePanel defaultSize={55} minSize={30}>
          <ScrollArea className="h-full">
            <div className="p-6 space-y-8 max-w-4xl mx-auto">
              {/* Sermon content */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">{sermon.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                    {sermon.preacher}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPinIcon className="h-4 w-4" />
                    {sermon.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    {format(new Date(sermon.date), 'MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpenIcon className="h-4 w-4" />
                    {sermon.primary_scripture}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={
                      sermonTypeColors[
                        sermon.sermon_type as keyof typeof sermonTypeColors
                      ]
                    }
                  >
                    {sermon.sermon_type}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TagIcon className="h-4 w-4" /> Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sermon.topics.map((topic: string) => (
                      <Badge key={topic} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
                {sermon.tags && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <TagIcon className="h-4 w-4" /> Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {sermon.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {sermon.summary && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageCircleIcon className="h-4 w-4" /> Summary
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {sermon.summary}
                  </p>
                </div>
              )}

              {sermon.key_points && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ListIcon className="h-4 w-4" /> Key Points
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                    {sermon.key_points.map((point: string, index: number) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sermon.scriptures && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpenIcon className="h-4 w-4" /> Referenced Scriptures
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sermon.scriptures.map((scripture: string) => (
                      <Badge key={scripture} variant="outline">
                        {scripture}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sermon.mentioned_people && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" /> People Mentioned
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {sermon.mentioned_people.map((person: string) => (
                        <Badge key={person} variant="outline">
                          {person}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {sermon.mentioned_events && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CalendarDaysIcon className="h-4 w-4" /> Events Referenced
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {sermon.mentioned_events.map((event: string) => (
                        <Badge key={event} variant="outline">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {sermon.file_name && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileTextIcon className="h-4 w-4" />
                    {sermon.file_name} ({Math.round(sermon.file_size / 1024)}{' '}
                    KB)
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={45} minSize={30}>
          <PDFViewer filePath={sermon.file_path} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
