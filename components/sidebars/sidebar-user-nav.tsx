'use client';

import { ChevronUp } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function SidebarUserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();

  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const displayEmail = user.email || '';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-auto py-2.5">
              <div className="flex items-center gap-3 w-full min-w-0">
                <Image
                  src={`https://avatar.vercel.sh/${user.email}`}
                  alt={user.email ?? 'User Avatar'}
                  width={32}
                  height={32}
                  className="rounded-full shrink-0"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-foreground truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {displayEmail}
                  </span>
                </div>
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  signOut({ redirectTo: '/' });
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
