'use client';

import type { User } from 'next-auth';
import { usePathname } from 'next/navigation';
import { PanelLeft, Sparkles, LayoutDashboard, Inbox, Map } from 'lucide-react';
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

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/OneMap', label: 'Map View', icon: Map },
];

export function AppSidebar({ user }: { user: User | undefined }) {
  const { setOpenMobile, state, toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();

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
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-[13.5px] font-bold tracking-tight truncate">
                Drafting Assistant
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => (isMobile ? setOpenMobile(false) : toggleSidebar())}
              aria-label="Close sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        </SidebarMenu>

        {/* Navigation */}
        <nav className="mt-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={handleClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-card border border-border text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
