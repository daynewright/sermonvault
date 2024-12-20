import ChatSection from '@/components/chat-section';
import { SermonSidebar } from '@/components/sermon-sidebar';

const ChatPage = () => {
  return (
    <div className="flex">
      <SermonSidebar />
      <div className="flex-1 container max-w-4xl px-4 py-6">
        <ChatSection />
      </div>
    </div>
  );
};

export default ChatPage;
