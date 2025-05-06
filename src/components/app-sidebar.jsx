"use client";

import * as React from "react";
import { useRouter } from "next/navigation"; // 使用 App Router 版本的 useRouter
import { ShipWheel, Search, MessageSquareText } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { navMain } from "@/lib/boards";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }) {
  const router = useRouter(); // 初始化 useRouter

  const handleHomeRedirect = () => {
    router.push("/home"); // 程式化導航到 /home
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => router.push("/")}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ShipWheel className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">公海</span>
                <span className="truncate text-xs">社交討論區</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenuButton tooltip="搜尋">
          <Search />
          <span>搜尋</span>
        </SidebarMenuButton>
        <SidebarMenuButton tooltip="對話">
          <MessageSquareText />
          <span>對話</span>
        </SidebarMenuButton>
        <SidebarMenuButton tooltip="返回首頁" onClick={handleHomeRedirect}>
          <span>返回首頁</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}