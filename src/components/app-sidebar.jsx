'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ShipWheel,
  Search,
  MessagesSquare,
  Newspaper,
  Cpu,
  CalendarDays,
  Piano,
  Users,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import SearchBar from '@/components/SearchBar';
import ChatModal from '@/components/ChatModal';
import { fetchBoardsData } from '@/lib/cache';

const iconMap = {
  新聞: Newspaper,
  科技: Cpu,
  生活: CalendarDays,
  興趣: Piano,
  其他: Users,
};

export function AppSidebar({ ...props }) {
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [items, setItems] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const boardsData = await fetchBoardsData();
        if (!boardsData || boardsData.length === 0) {
          console.error('No boards data returned');
          setError('無法載入看板數據');
          setBoards([]);
          return;
        }
        console.log('Boards set in AppSidebar:', boardsData);
        setBoards(boardsData);
      } catch (error) {
        console.error('Error fetching boards:', error);
        setError('錯誤載入看板數據');
        setBoards([]);
      }
    };

    fetchBoards();
  }, []);

  useEffect(() => {
    const categories = [
      { title: '新聞', names: ['時事台', '財經台'] },
      { title: '科技', names: ['手機台', '電腦台'] },
      {
        title: '生活',
        names: ['飲食台', '上班台', '旅遊台', '校園台', '感情台'],
      },
      {
        title: '興趣',
        names: ['學術台', '體育台', '遊戲台', '影視台', '音樂台', '寵物台'],
      },
      { title: '其他', names: ['吹水台', '管理台'] },
    ];

    // 檢查資料庫中的看板名稱是否在 categories 中
    const missingBoards = boards
      .filter(
        (board) =>
          !categories.some((category) => category.names.includes(board.name))
      )
      .map((board) => board.name);

    if (missingBoards.length > 0) {
      console.warn('Boards not found in categories:', missingBoards);
      // 可選：將未分類的看板添加到「其他」分類
      categories
        .find((cat) => cat.title === '其他')
        .names.push(...missingBoards);
    }

    const dynamicItems = categories.map((category) => {
      const categoryBoards = boards
        .filter((board) => category.names.includes(board.name))
        .map((board) => ({
          title: board.name,
          url: `/boards/${encodeURIComponent(board.name)}`,
          slug: board.name,
        }));

      return {
        title: category.title,
        icon: iconMap[category.title],
        isActive: category.title === '新聞',
        items: categoryBoards,
      };
    });

    const filteredItems = dynamicItems.filter((item) => item.items.length > 0);
    console.log('Dynamic items:', filteredItems);
    setItems(filteredItems);
  }, [boards]);

  // const handleHomeRedirect = () => {
  //   router.push("/");
  // };

  if (error) {
    return <div className='text-red-500 p-4'>{error}</div>;
  }

  return (
    <>
      <Sidebar collapsible='offcanvas' {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size='lg' onClick={() => router.push('/')}>
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary text-sidebar-primary-foreground'>
                  <ShipWheel className='size-4' />
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>公海</span>
                  <span className='truncate text-xs'>社交討論區</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SearchBar />
            </SidebarMenuItem>
            <SidebarMenuButton
              tooltip='對話'
              onClick={() => setIsChatOpen(true)}
            >
              <MessagesSquare />
              <span>對話</span>
            </SidebarMenuButton>
            {/* <SidebarMenuButton tooltip="返回首頁" onClick={handleHomeRedirect}>
              <span>返回首頁</span>
            </SidebarMenuButton> */}
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={items} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
