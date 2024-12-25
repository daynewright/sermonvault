import { useMutation } from '@tanstack/react-query';

type SendMessageParams = {
  message: string;
  messages: any[];
};

const sendMessage = async ({ message, messages }: SendMessageParams): Promise<Response> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, messages }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response;
};

export const useChat = () => {
  return useMutation({
    mutationFn: sendMessage
  });
};
