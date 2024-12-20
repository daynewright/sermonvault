'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/hooks/use-user';
import { MarkdownResponse } from './markdown-response';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  isLoading?: boolean;
};

export default function ChatSection() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Find the Radix UI viewport element
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    try {
      setIsLoading(true);
      // Add user message immediately
      const userMessage = {
        id: Date.now().toString(),
        content: message,
        role: 'user' as const,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add loading message for AI
      const loadingMessage = {
        id: (Date.now() + 1).toString(),
        content: '',
        role: 'assistant' as const,
        isLoading: true,
      };
      setMessages((prev) => [...prev, loadingMessage]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let aiMessage = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        aiMessage += text;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessage.id
              ? { ...msg, content: aiMessage, isLoading: false }
              : msg
          )
        );

        // Force scroll after each update
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <ChatMessageList>
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              variant={message.role === 'user' ? 'sent' : 'received'}
            >
              <ChatBubbleAvatar
                src={
                  message.role === 'user'
                    ? user?.user_metadata.avatar_url
                    : undefined
                }
                fallback={
                  message.role === 'user'
                    ? user?.user_metadata.name?.charAt(0)
                    : 'AI'
                }
              />
              <ChatBubbleMessage
                variant={message.role === 'user' ? 'sent' : 'received'}
                isLoading={message.isLoading}
              >
                {message.role === 'assistant' ? (
                  <MarkdownResponse content={message.content} />
                ) : (
                  message.content
                )}
              </ChatBubbleMessage>
            </ChatBubble>
          ))}
        </ChatMessageList>
      </ScrollArea>

      <div className="border-t p-4">
        <ChatInput
          placeholder="Ask me about your sermons..."
          onSend={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
