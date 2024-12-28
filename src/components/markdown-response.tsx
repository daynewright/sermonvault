'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownResponseProps {
  content: string;
  className?: string;
}

export function MarkdownResponse({ content }: MarkdownResponseProps) {
  const displayContent = content.split('SERMONS_START')[0].trim();

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {displayContent}
    </ReactMarkdown>
  );
}
