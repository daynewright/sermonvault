'use client';

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownResponseProps {
  content: string;
  className?: string;
}

export function MarkdownResponse({
  content,
  className,
}: MarkdownResponseProps) {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
