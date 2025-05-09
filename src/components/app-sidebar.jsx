"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ShipWheel, Search, MessageSquareText, Newspaper, Cpu, CalendarDays, Piano, Users } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
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

const iconMap = {
  "新聞": Newspaper,
  "科技": Cpu,
  "生活": CalendarDays,
  "興趣": Piano,
  "其他": Users,
};

export function AppSidebar({ ...props }) {
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await fetch("/api/boards", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setBoards(data.boards);
        }
      } catch (error) {
        console.error("Error fetching boards:", error);
      }
    };

    fetchBoards();
  }, []);

  useEffect(() => {
    const categories = [
      { title: "新聞", names: ["時事台", "財經台"] },
      { title: "科技", names: ["手機台", "電腦台"] },
      { title: "生活", names: ["飲食台", "上班台", "旅遊台", "校園台"] },
      { title: "興趣", names: ["學術台", "體育台", "遊戲台", "影視台", "音樂台"] },
      { title: "其他", names: ["吹水台", "管理台"] },
    ];

    const dynamicItems = categories.map((category) => {
      const categoryBoards = boards
        .filter((board) => category.names.includes(board.name))
        .map((board) => ({
          title: board.name,
          url: `/boards/${board.name}`,
          slug: board.name,
        }));

      return {
        title: category.title,
        icon: iconMap[category.title],
        isActive: category.title === "新聞",
        items: categoryBoards,
      };
    });

    setItems(dynamicItems.filter((item) => item.items.length > 0));
  }, [boards]);

  const handleHomeRedirect = () => {
    router.push("/home");
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
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}