'use client';

import { useSermonsStore } from '@/store/use-sermons-store';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileUp, MessageSquarePlus } from 'lucide-react';
import { UploadSermonDialog } from './upload-sermon-dialog';

export function EmptyState() {
  const sermonCount = useSermonsStore((state) => state.sermonCount);
  const loadingSermons = useSermonsStore((state) => state.loadingSermons);

  if (loadingSermons) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle>Welcome to SermonVault</CardTitle>
          <CardDescription>Loading sermons...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (sermonCount === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle>Welcome to SermonVault</CardTitle>
          <CardDescription>
            Get started by uploading your first sermon.
          </CardDescription>
          <CardDescription>
            Once you upload a sermon, you can ask AI questions about it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <div className="rounded-full bg-primary/10 p-6">
            <FileUp className="h-12 w-12 text-primary" />
          </div>
          <UploadSermonDialog />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 text-center">
      <h2 className="text-2xl font-semibold">
        Ask questions about your sermons
      </h2>
      <p className="text-muted-foreground mt-2">
        Ask questions about your uploaded sermons
      </p>
      <div className="flex flex-col items-center gap-4 mt-6">
        <div className="rounded-full bg-primary/10 p-6">
          <MessageSquarePlus className="h-12 w-12 text-primary" />
        </div>
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
