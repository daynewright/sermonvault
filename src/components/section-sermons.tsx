import { useState } from 'react';
import { useSermons } from '@/hooks/fetch/use-sermons';
import { SermonCard } from '@/components/sermon-card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X } from 'lucide-react';

export function SectionSermons() {
  const { data: sermons, isLoading } = useSermons();
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeTopics, setActiveTopics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const handleSermonTypeClick = (type: string) => {
    setActiveType(activeType === type ? null : type);
  };

  const handleTopicClick = (topic: string) => {
    setActiveTopics((prev) => {
      const newTopics = new Set(prev);
      if (newTopics.has(topic)) {
        newTopics.delete(topic);
      } else {
        newTopics.add(topic);
      }
      return newTopics;
    });
  };

  const clearFilters = () => {
    setActiveType(null);
    setActiveTopics(new Set());
    setSearchQuery('');
  };

  const filteredSermons = sermons?.filter((sermon: any) => {
    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        sermon.title.toLowerCase().includes(searchLower) ||
        sermon.preacher.toLowerCase().includes(searchLower) ||
        sermon.location.toLowerCase().includes(searchLower) ||
        sermon.primaryScripture.toLowerCase().includes(searchLower) ||
        (Array.isArray(sermon.topics) &&
          sermon.topics.some((topic: string) =>
            topic.toLowerCase().includes(searchLower)
          ));

      if (!matchesSearch) return false;
    }

    // Type filter
    const matchesType = !activeType || sermon.sermonType === activeType;

    // Topics filter
    const matchesTopics =
      activeTopics.size === 0 ||
      (Array.isArray(sermon.topics) &&
        [...activeTopics].every((topic) => sermon.topics.includes(topic)));

    return matchesType && matchesTopics;
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-6 space-y-6 bg-background border-b">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sermon Library
          </h1>
          <span className="text-sm text-muted-foreground">
            {filteredSermons?.length} sermon
            {filteredSermons?.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search sermons by title, preacher, location, or scripture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>

          {/* Active Filters */}
          {(activeType || activeTopics.size > 0 || searchQuery) && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-sm">
              <span className="text-sm text-slate-600">Active filters:</span>
              {searchQuery && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => setSearchQuery('')}
                >
                  Search: {searchQuery}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {activeType && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => setActiveType(null)}
                >
                  {activeType}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {[...activeTopics].map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => handleTopicClick(topic)}
                >
                  {topic}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              <button
                onClick={clearFilters}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Sermons Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSermons?.map((sermon: any) => (
              <SermonCard
                key={sermon.id}
                sermonId={sermon.id}
                title={sermon.title}
                date={new Date(sermon.date)}
                preacher={sermon.preacher}
                location={sermon.location}
                primaryScripture={sermon.primaryScripture}
                sermonType={sermon.sermonType}
                topics={sermon.topics}
                summary={sermon.summary}
                onSermonTypeClick={handleSermonTypeClick}
                onTopicClick={handleTopicClick}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
