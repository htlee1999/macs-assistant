'use client';

import type { User } from 'next-auth';
import { AppSidebar } from '@/components/sidebars/app-sidebar';
import { AppDocumentsBar } from '@/components/sidebars/app-documents-bar';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import {
  DocumentsBarProvider,
  useCitationsBar,
} from '@/components/ui/documents-bar';

const LEFT_WIDTH = '16rem';
const RIGHT_WIDTH = '18rem';

function Grid({
  user,
  children,
}: {
  user: User | undefined;
  children: React.ReactNode;
}) {
  const { state: leftState } = useSidebar();
  const { state: rightState } = useCitationsBar();

  const left = leftState === 'expanded' ? LEFT_WIDTH : '0rem';
  const right = rightState === 'expanded' ? RIGHT_WIDTH : '0rem';

  return (
    <div
      className="grid h-screen w-full overflow-hidden transition-[grid-template-columns] duration-200 ease-linear"
      style={{ gridTemplateColumns: `${left} minmax(0, 1fr) ${right}` }}
    >
      <aside className="overflow-hidden">
        <AppSidebar user={user} />
      </aside>
      <main className="relative flex min-w-0 flex-col overflow-auto bg-background">
        {children}
      </main>
      <aside className="overflow-hidden">
        <AppDocumentsBar />
      </aside>
    </div>
  );
}

export function RecordShell({
  user,
  defaultOpen,
  children,
}: {
  user: User | undefined;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ '--sidebar-width': LEFT_WIDTH } as React.CSSProperties}
    >
      <DocumentsBarProvider
        defaultOpen={false}
        style={{ '--sidebar-width': RIGHT_WIDTH } as React.CSSProperties}
      >
        <Grid user={user}>{children}</Grid>
      </DocumentsBarProvider>
    </SidebarProvider>
  );
}
