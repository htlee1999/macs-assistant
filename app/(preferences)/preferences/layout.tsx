import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/sidebars/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { DocumentsBarInset, DocumentsBarProvider } from '@/components/ui/documents-bar';
import { AppDocumentsBar } from '@/components/sidebars/app-documents-bar';

import { auth } from '@/app/(auth)/auth';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <DocumentsBarProvider defaultOpen={false}>
        <div className="flex flex-row h-screen w-full">
          <AppSidebar user={session?.user} />
          <DocumentsBarInset>
            <SidebarInset>{children}</SidebarInset>
          </DocumentsBarInset>
          <AppDocumentsBar/>
        </div>
      </DocumentsBarProvider>
    </SidebarProvider>
  );
}