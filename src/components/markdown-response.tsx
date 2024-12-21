'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownResponseProps {
  content: string;
  className?: string;
}

export function MarkdownResponse({ content }: MarkdownResponseProps) {
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
