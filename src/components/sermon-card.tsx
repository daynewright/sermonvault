import Link from 'next/link';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  CalendarIcon,
  BookOpenIcon,
  UserIcon,
  MapPinIcon,
  InfoIcon,
  FileTextIcon,
  EditIcon,
  Trash2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SermonCardProps {
  sermonId: string;
  title: string;
  date: Date;
  preacher: string;
  location: string;
  primaryScripture: string;
  sermonType: 'expository' | 'textual' | 'topical' | 'narrative';
  topics: string[];
  summary?: string;
  onSermonTypeClick?: (type: string) => void;
  onTopicClick?: (topic: string) => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Sermon type colors (modern, complementary)
const sermonTypeColors = {
  expository: 'bg-blue-700 text-white hover:bg-blue-800',
  topical: 'bg-slate-700 text-white hover:bg-slate-800',
  textual: 'bg-indigo-700 text-white hover:bg-indigo-800',
  narrative: 'bg-zinc-700 text-white hover:bg-zinc-800',
  special: 'bg-stone-700 text-white hover:bg-stone-800',
};

// Topic colors (coordinated, subtle)
const topicColors = [
  'bg-blue-50 text-blue-900 hover:bg-blue-100',
  'bg-slate-50 text-slate-900 hover:bg-slate-100',
  'bg-indigo-50 text-indigo-900 hover:bg-indigo-100',
  'bg-zinc-50 text-zinc-900 hover:bg-zinc-100',
  'bg-stone-50 text-stone-900 hover:bg-stone-100',
];

// Border colors for the left accent
const getSermonTypeColor = (type: string) => {
  switch (type) {
    case 'expository':
      return '#1d4ed8'; // blue-700
    case 'topical':
      return '#334155'; // slate-700
    case 'textual':
      return '#4338ca'; // indigo-700
    case 'narrative':
      return '#3f3f46'; // zinc-700
    case 'special':
      return '#44403c'; // stone-700
    default:
      return '#1d4ed8'; // blue-700
  }
};

// Sermon type descriptions
const sermonTypeDescriptions = {
  expository: 'Verse-by-verse explanation of a Scripture passage',
  topical: 'Focused exploration of a specific biblical theme or subject',
  textual: 'In-depth study of a particular Bible verse or short passage',
  narrative: 'Examination of biblical stories and their meaning',
  special: 'Unique messages for specific occasions or purposes',
};

export function SermonCard({
  sermonId,
  title,
  date,
  preacher,
  location,
  primaryScripture,
  sermonType,
  topics,
  summary,
  onSermonTypeClick,
  onTopicClick,
  onView,
  onEdit,
  onDelete,
}: SermonCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleView = (e: React.MouseEvent) => {
    e.preventDefault();
    onView?.();
  };

  return (
    <Link href={`/sermons/${sermonId}`}>
      <Card
        className="w-full max-w-md overflow-hidden border-l-4 flex flex-col rounded-sm hover:shadow-md transition-shadow"
        style={{ borderLeftColor: getSermonTypeColor(sermonType) }}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 min-w-0">
              <h3 className="text-xl font-semibold leading-tight line-clamp-2">
                {title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-1 min-w-0 max-w-[45%]">
                  <UserIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{preacher}</span>
                </div>
                <span className="shrink-0">•</span>
                <div className="flex items-center gap-1 min-w-0 max-w-[45%]">
                  <MapPinIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={`uppercase text-xs font-medium shrink-0 ${sermonTypeColors[sermonType]} cursor-pointer`}
                    onClick={() => onSermonTypeClick?.(sermonType)}
                  >
                    {sermonType}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{sermonTypeDescriptions[sermonType]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge
              variant="outline"
              className="flex items-center gap-1 bg-white rounded-sm hover:bg-slate-50 transition-colors px-2 py-0.5 h-[22px]"
            >
              <CalendarIcon className="h-3 w-3 text-slate-600" />
              {format(date, 'MMM d, yyyy')}
            </Badge>
            <Badge
              variant="outline"
              className="flex items-center gap-1 bg-white rounded-sm hover:bg-slate-50 transition-colors px-2 py-0.5 h-[22px]"
            >
              <BookOpenIcon className="h-3 w-3 text-slate-600" />
              {primaryScripture}
            </Badge>
            {summary && (
              <HoverCard open={isOpen} onOpenChange={setIsOpen}>
                <HoverCardTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 bg-white rounded-sm hover:bg-slate-50 transition-colors px-2 py-0.5 h-[22px] cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <InfoIcon className="h-3 w-3 text-slate-600" />
                    Summary
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent
                  className="w-[320px] p-4"
                  side="top"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs text-slate-600 italic leading-relaxed">
                    {summary}
                  </p>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic, index) => (
              <TooltipProvider key={topic}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      className={`text-xs font-medium transition-colors h-[22px] inline-flex items-center cursor-pointer ${
                        topicColors[index % topicColors.length]
                      }`}
                      onClick={() => onTopicClick?.(topic)}
                    >
                      {topic}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filter by {topic}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
        <div className="mt-auto">
          <CardFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
                      onClick={handleView}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View sermon</p>
                  </TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-slate-600 hover:text-blue-600"
                        onClick={onEdit}
                      >
                        <EditIcon className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit sermon</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-slate-600 hover:text-red-600"
                        onClick={onDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete sermon</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </CardFooter>
        </div>
      </Card>
    </Link>
  );
}
