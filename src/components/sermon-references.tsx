import { ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';

type SermonReference = {
  id: string;
  title: string;
};

export function SermonReferences({ sermons }: { sermons: SermonReference[] }) {
  if (!sermons || sermons.length === 0) return null;

  // Create array of unique sermons by ID
  const uniqueSermons = Array.from(
    new Map(sermons.map((s) => [s.id, s])).values()
  );

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {uniqueSermons.map((sermon) => (
        <Link
          key={sermon.id}
          href={`/sermons/${sermon.id}`}
          target="_blank"
          className="inline-flex items-center rounded-md bg-blue-50 px-4 py-2 text-xs font-medium text-blue-500 hover:bg-blue-100 transition-colors"
        >
          {sermon.title} <ExternalLinkIcon className="w-4 h-4 ml-2" />
        </Link>
      ))}
    </div>
  );
}
