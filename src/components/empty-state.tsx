'use client';

import { useSermons } from '@/hooks/fetch/use-sermons';

export function EmptyState() {
  const { data: sermons = [], isLoading: loadingSermons } = useSermons();

  const sermonCount = sermons.length;

  if (sermonCount === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold">Chat View</h3>
        {loadingSermons ? (
          <p className="text-muted-foreground">Loading sermons...</p>
        ) : (
          <>
            <p className="text-muted-foreground">
              Get started by uploading your first sermon.
            </p>
            <p className="text-muted-foreground">
              Once you upload a sermon, you can ask AI questions about it.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 text-center">
      <h2 className="text-2xl font-semibold">
        Ask questions about your sermons
      </h2>
      <div className="flex flex-col items-center gap-4 mt-6">
        <div className="text-center max-w-sm text-muted-foreground">
          <p>Try asking questions like:</p>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="font-bold">
              &quot;What are the main points from last week&apos;s sermon?&quot;
            </li>
            <li className="font-bold">&quot;Find sermons about grace&quot;</li>
            <li className="font-bold">
              &quot;Summarize the sermon from December 1st&quot;
            </li>
            <li className="font-bold">
              &quot;What does the Bible say about love?&quot;
            </li>
            <li className="font-bold">
              &quot;When did I preach on the topic of forgiveness?&quot;
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
