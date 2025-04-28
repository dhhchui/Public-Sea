'use client';

import * as React from 'react';
import {
  AudioWaveform,
  CalendarDays,
  Cpu,
  ShipWheel,
  Search,
  GalleryVerticalEnd,
  UsersRound,
  UserRound,
  Piano,
  Newspaper,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import { TeamSwitcher } from '@/components/team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInput,
} from '@/components/ui/sidebar';

// This is sample data.
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  // teams: [
  //   {
  //     name: "Acme Inc",
  //     logo: GalleryVerticalEnd,
  //     plan: "Enterprise",
  //   },
  //   {
  //     name: "Acme Corp.",
  //     logo: AudioWaveform,
  //     plan: "Startup",
  //   },
  //   {
  //     name: "Evil Corp.",
  //     logo: Command,
  //     plan: "Free",
  //   },
  // ],
  navMain: [
    {
      title: '新聞',
      url: '#',
      icon: Newspaper,
      isActive: true,
      items: [
        {
          title: '時事台',
          url: '#',
        },
        {
          title: '財經台',
          url: '#',
        },
        {
          title: '娛樂台',
          url: '#',
        },
        {
          title: '房屋台',
          url: '#',
        },
      ],
    },
    {
      title: '科技',
      url: '#',
      icon: Cpu,
      items: [
        {
          title: '手機台',
          url: '#',
        },
        {
          title: '電器台',
          url: '#',
        },
        {
          title: '硬件台',
          url: '#',
        },
        {
          title: '軟件台',
          url: '#',
        },
      ],
    },
    {
      title: '生活',
      url: '#',
      icon: CalendarDays,
      items: [
        {
          title: '創意台',
          url: '#',
        },
        {
          title: '感情台',
          url: '#',
        },
        {
          title: '飲食台',
          url: '#',
        },
        {
          title: '上班台',
          url: '#',
        },
        {
          title: '旅遊台',
          url: '#',
        },
        {
          title: '校園台',
          url: '#',
        },
      ],
    },
    {
      title: '興趣',
      url: '#',
      icon: Piano,
      items: [
        {
          title: '體育台',
          url: '#',
        },
        {
          title: '學術台',
          url: '#',
        },
        {
          title: '遊戲台',
          url: '#',
        },
        {
          title: '影視台',
          url: '#',
        },
        {
          title: '動漫台',
          url: '#',
        },
        {
          title: '音樂台',
          url: '#',
        },
      ],
    },
  ],
  projects: [
    {
      name: '土瓜灣漢堡包',
      url: '#',
      icon: UserRound,
    },
    {
      name: '深水埗糯米雞',
      url: '#',
      icon: UserRound,
    },
    {
      name: '跳舞群組',
      url: '#',
      icon: UsersRound,
    },
  ],
};

export function AppSidebar({ ...props }) {
  return (
    <Sidebar collapsible='icon' {...props}>
      {/* <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader> */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <a href='#'>
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                  <ShipWheel className='size-4' />
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>公海</span>
                  <span className='truncate text-xs'>社交討論區</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenuButton tooltip='搜尋'>
          <Search />
          <span>搜尋</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
