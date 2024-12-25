import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ForwardIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onSend?: (message: string) => void;
}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, onSend, ...props }, ref) => {
    const [message, setMessage] = React.useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleSend = () => {
      if (message.trim() && onSend) {
        onSend(message);
        setMessage('');
      }
    };

    return (
      <div className="relative">
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            ref={ref}
            rows={1}
            name="message"
            style={{ paddingRight: '3rem' }}
            className={cn(
              'max-h-12 px-4 py-3 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-md flex items-center h-16 resize-none',
              className
            )}
            {...props}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8',
            !message.trim() && 'opacity-50 cursor-not-allowed'
          )}
          disabled={!message.trim()}
          onClick={handleSend}
        >
          <ForwardIcon className="h-5 w-5" />
        </Button>
      </div>
    );
  }
);
ChatInput.displayName = 'ChatInput';

export { ChatInput };
