'use client';

import { useState } from 'react';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  isLoading?: boolean;
};

export default function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add loading message
    const loadingMessage: Message = {
      id: 'loading',
      content: '',
      role: 'assistant',
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          // Update the assistant's message as we receive chunks
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === 'loading'
                ? { ...msg, content: assistantMessage, isLoading: false }
                : msg
            )
          );
        }
      }

      // Replace loading message with final message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === 'loading'
            ? {
                id: Date.now().toString(),
                content: assistantMessage,
                role: 'assistant',
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      // Handle error state
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <ScrollArea className="flex-1 px-4">
        <ChatMessageList>
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              variant={message.role === 'user' ? 'sent' : 'received'}
            >
              <ChatBubbleAvatar
                fallback={message.role === 'user' ? 'US' : 'AI'}
              />
              <ChatBubbleMessage
                variant={message.role === 'user' ? 'sent' : 'received'}
                isLoading={message.isLoading}
              >
                {message.content}
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
