'use client';

import { useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionChat } from '@/components/section-chat';
import { SectionSermons } from '@/components/section-sermons';
import { SectionReports } from '@/components/section-reports';
import { SermonSidebar } from '@/components/sermon-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { MessageCircle, BookOpen, BarChart } from 'lucide-react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Separator } from '@/components/ui/separator';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const DashboardPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'sermons';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  // Update tab if URL changes
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams, activeTab]);

  const renderTabContent = useCallback(
    (Component: React.FC, tabValue: string) => {
      return (
        <TabsContent
          value={tabValue}
          className="flex-1 overflow-y-auto h-[calc(100vh-10rem)]"
        >
          <Component />
        </TabsContent>
      );
    },
    []
  );

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <SermonSidebar />
        <SidebarInset>
          <main className="flex-1 flex flex-col h-full">
            <div className="flex items-center w-full border-b">
              <SidebarTrigger className="mx-2" />
              <Separator orientation="vertical" className="my-2 h-4" />
              <DashboardHeader className="flex-1" />
            </div>
            <div className="flex-1 container max-w-7xl mx-auto px-4 py-6 overflow-hidden">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full h-full space-y-6"
              >
                <div className="flex justify-center">
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger
                      value="sermons"
                      className="flex items-center gap-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      Sermons
                    </TabsTrigger>
                    <TabsTrigger
                      value="chat"
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger
                      value="reports"
                      className="flex items-center gap-2"
                    >
                      <BarChart className="h-4 w-4" />
                      Reports
                    </TabsTrigger>
                  </TabsList>
                </div>
                {renderTabContent(SectionSermons, 'sermons')}
                {renderTabContent(SectionChat, 'chat')}
                {renderTabContent(SectionReports, 'reports')}
              </Tabs>
            </div>
            <Toaster />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
