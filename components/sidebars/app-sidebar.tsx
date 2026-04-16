'use client';

import type { User } from 'next-auth';
import { PanelLeft } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function AppSidebar({ user }: { user: User | undefined }) {
  const { setOpenMobile, state, toggleSidebar, isMobile } = useSidebar();

  const handleClose = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="none"
      className="h-full border-r border-border"
      data-state={state}
    >
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center gap-2">
            <Link
              href="/"
              onClick={handleClose}
              className="flex flex-row gap-3 items-center min-w-0"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer truncate">
                Mcdonald's Assistant
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => (isMobile ? setOpenMobile(false) : toggleSidebar())}
              aria-label="Close sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
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