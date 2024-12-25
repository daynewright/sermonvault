import { NotebookPen } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { AvatarDropdown } from '@/components/avatar-dropdown';
import { UploadSermonDialog } from '@/components/upload-sermon-dialog';

export const DashboardHeader = ({ className }: { className?: string }) => {
  const { user } = useUser();

  return (
    <div className={cn('flex h-16 items-center px-4', className)}>
      <div className="flex-1 flex items-center gap-2 font-medium text-xl">
        <NotebookPen className="w-6 h-6" />
        SermonVault
      </div>
      <UploadSermonDialog buttonVariant="ghost" />
      <AvatarDropdown
        email={user?.email}
        image={user?.user_metadata?.avatar_url}
        name={user?.user_metadata?.full_name}
      />
    </div>
  );
};
