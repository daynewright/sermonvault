'use client';

import { AvatarDropdown } from '@/components/avatar-dropdown';
import { NotebookPen } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { UploadSermonDialog } from '@/components/upload-sermon-dialog';

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();

  return (
    <div>
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex-1 flex items-center gap-2 font-medium text-xl">
            <NotebookPen className="w-6 h-6" />
            SermonVault
          </div>
          <UploadSermonDialog />
          <AvatarDropdown
            email={user?.email}
            image={user?.user_metadata?.avatar_url}
            name={user?.user_metadata?.full_name}
          />
        </div>
      </div>
      {children}
    </div>
  );
};

export default ChatLayout;
