'use client';

import { AvatarDropdown } from '@/components/avatar-dropdown';
import { useSession } from 'next-auth/react';

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const { email, image, name } = session?.user || {};

  return (
    <div>
      <div className="flex justify-end m-4 ">
        <AvatarDropdown email={email} image={image} name={name} />
      </div>
      {children}
    </div>
  );
};

export default ChatLayout;
