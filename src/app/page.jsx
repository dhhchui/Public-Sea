'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import PopularPosts from '@/components/PopularPosts';
import RecommendedUsers from '@/components/RecommendedUsers'; // 導入 RecommendedUsers
import { fetchBoardsData } from '@/lib/cache';
import { getPostListCacheKey } from '@/components/post-list';
import { useSWRConfig } from 'swr';

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [boardName, setBoardName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const boardsData = await fetchBoardsData();
        setBoards(boardsData);
        if (boardsData.length > 0) {
          setBoardName(boardsData[0].name);
        }
      } catch (error) {
        console.error('Error fetching boards:', error);
        setMessage({
          text: '無法載入分台列表，可能是伺服器或資料庫連線問題。',
          type: 'error',
        });
      }
    };

    fetchBoards();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ text: '請先登入', type: 'error' });
        setTimeout(() => router.push('/login'), 1500);
        return;
      }

      const selectedBoard = boards.find((b) => b.name === boardName);
      if (!selectedBoard) {
        setMessage({ text: `無效的分台: ${boardName}`, type: 'error' });
        return;
      }

      const boardId = selectedBoard.id;
      console.log('Submitting post:', { title, content, boardId });

      const res = await fetch('/api/create-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, boardId }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: '貼文新增成功', type: 'success' });
        setTitle('');
        setContent('');
        const cacheKey = getPostListCacheKey(boardId);
        if (cacheKey) {
          console.log(`Triggering revalidation for cache key: ${cacheKey}`);
          mutate(cacheKey, undefined, { revalidate: true });
        }
        setTimeout(() => router.push(`/view-post/${data.post.id}`), 1500);
      } else {
        console.error('API error:', data);
        setMessage({ text: data.message || '新增貼文失敗', type: 'error' });
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setMessage({ text: `新增貼文失敗: ${error.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className='sticky top-0 bg-background'>
        <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
          <div className='flex w-full items-center gap-2 px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator
              orientation='vertical'
              className='mr-2 data-[orientation=vertical]:h-4'
            />
            <Breadcrumb className='w-full'>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>討論</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>熱門貼文</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {/* 移除「新增留言」按鈕 */}
          </div>
        </header>
        <Separator />
      </div>
      <PopularPosts />
      <div className='min-h-screen bg-gray-100 py-8'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
          <h1 className='text-3xl font-bold text-gray-800 mb-6 text-center'>
            歡迎來到公海社交討論區
          </h1>

          <PopularPosts />

          <Card>
            <CardHeader>
              <CardTitle className='text-2xl font-semibold text-gray-700'>
                新增貼文
              </CardTitle>
            </CardHeader>
            <CardContent>
              {message && (
                <div
                  className={`p-3 mb-4 rounded ${
                    message.type === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {message.text}
                </div>
              )}
              <form onSubmit={handleSubmit} className='space-y-5'>
                <div>
                  <label
                    htmlFor='board'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    分台
                  </label>
                  <select
                    id='board'
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    className='w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition'
                    disabled={isSubmitting}
                  >
                    {boards.map((board) => (
                      <option key={board.id} value={board.name}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor='title'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    標題
                  </label>
                  <input
                    id='title'
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className='w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition'
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label
                    htmlFor='content'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    內容
                  </label>
                  <textarea
                    id='content'
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className='w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition'
                    rows='5'
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  type='submit'
                  className={`w-full ${
                    isSubmitting
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } transition`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '發佈中...' : '發佈貼文'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <RecommendedUsers />
        </div>
      </div>
    </>
  );
}
/* import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex-1 p-2">
          {/* 這裡將由子路由渲染，例如 boards/[board]/page.jsx */
/*         </div>
      </SidebarInset>
    </SidebarProvider>
  );
} */
