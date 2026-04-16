import { Suspense } from 'react';
import { cookies } from 'next/headers';

import { auth } from '../(auth)/auth';
import { RecordIdProvider } from '@/components/recordIdContext';
import { ProcessorProvider } from '@/components/daily-processor';
import { RecordShell } from '@/components/sidebars/record-shell';

async function LayoutShell({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <RecordShell user={session?.user} defaultOpen={!isCollapsed}>
      {children}
    </RecordShell>
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
