import { Suspense } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SidebarProvider>{children}</SidebarProvider>
    </Suspense>
  );
};

export default DashboardLayout;
