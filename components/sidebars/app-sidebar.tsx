'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { SidebarHistory } from '@/components/sidebars/sidebar-history';
import { SidebarUserNav } from '@/components/sidebars/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, openMobile, state } = useSidebar();

  const handleClose = () => {
    console.log('Closing sidebar');
    setOpenMobile(false);
  };

  return (
    <Sidebar 
      className="group-data-[side=left]:border-r-0"
      data-state={state}
    >
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={handleClose}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Drafting Assistant
              </span>
            </Link>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}