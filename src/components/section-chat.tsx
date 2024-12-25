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
import { useUser } from '@/hooks/fetch/use-user';
import { MarkdownResponse } from './markdown-response';
import { EmptyState } from './empty-state';
import { useSermonsStore } from '@/store/use-sermons-store';

import { useIsMobile } from '@/hooks/use-mobile';
import { useChat } from '@/hooks/fetch/use-chat';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  isLoading?: boolean;
};

export const SectionChat = () => {
  const { data: user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();

  const sermonCount = useSermonsStore((state) => state.sermonCount);

  const { mutateAsync: sendMessage } = useChat();

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
  }, [messages.length]);

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

      try {
        const response = await sendMessage({ message, messages });

        if (!response) throw new Error('No response available');

        const reader = response.body?.getReader();
        let aiMessage = '';
        while (true) {
          const result = await reader?.read();
          if (!result || result.done) break;

          const text = new TextDecoder().decode(result.value);
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
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <ChatMessageList className="text-sm px-4 pb-4">
            {messages.length === 0 && <EmptyState />}
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                variant={message.role === 'user' ? 'sent' : 'received'}
              >
                {!isMobile && (
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
                )}
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
      </div>
      <div className="border-t bg-white shrink-0">
        <div className="p-4">
          {sermonCount > 0 && (
            <ChatInput
              placeholder="Ask me about your sermons..."
              onSend={handleSendMessage}
              disabled={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};
