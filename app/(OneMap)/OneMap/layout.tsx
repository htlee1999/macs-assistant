import { Suspense } from 'react';
import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/sidebars/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { RecordIdProvider } from '@/components/recordIdContext';
import { ProcessorProvider } from '@/components/daily-processor';

import { auth } from '@/app/(auth)/auth';

async function LayoutShell({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <div className="flex flex-row h-screen w-full">
        <AppSidebar user={session?.user} />
        <SidebarInset>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProcessorProvider>
      <RecordIdProvider>
        <Suspense fallback={null}>
          <LayoutShell>{children}</LayoutShell>
        </Suspense>
      </RecordIdProvider>
    </ProcessorProvider>
  );
}
