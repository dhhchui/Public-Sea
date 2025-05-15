'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Eye, ThumbsUp } from 'lucide-react';

// 使用真實的 boardId 映射表
const boardIdMap = {
  吹水台: 1,
  管理台: 2,
  學術台: 3,
  時事台: 4,
  財經台: 5,
  手機台: 6,
  電腦台: 7,
  飲食台: 8,
  上班台: 9,
  旅遊台: 10,
  校園台: 11,
  體育台: 12,
  遊戲台: 13,
  影視台: 14,
  音樂台: 15,
  感情台: 16,
};

// 自訂 fetcher 函數給 useSWR 使用
const fetcher = async (url) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`伺服器錯誤: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.posts || [];
};

export function PostList({ boardId }) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: posts = [], error } = useSWR(
    isMounted && boardId ? `/api/post-list?boardId=${boardId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 分鐘去重間隔
      fallbackData: [],
    }
  );

  if (error) {
    return <p className='text-center text-red-500'>{error.message}</p>;
  }

  if (posts.length === 0) {
    return <p className='text-gray-500'>目前還沒有貼文，快來發表第一個吧！</p>;
  }

  return (
    <>
      {posts.map((post) => (
        <Card
          key={post.id}
          className='cursor-pointer'
          onClick={() => router.push(`/view-post/${post.id}`)}
        >
          <CardHeader>
            <Badge variant='secondary'>
              {post.author.nickname || post.author.username}
            </Badge>
            <CardDescription>
              {new Date(post.createdAt).toLocaleString()}
            </CardDescription>
            <CardTitle className='text-lg'>{post.title}</CardTitle>
          </CardHeader>
          {/* <CardContent>
              <p>{post.content}</p>
            </CardContent> */}
          <CardFooter className='flex gap-2'>
            <Button variant='ghost' className='pointer-events-none'>
              <ThumbsUp />
              {post.likeCount}
            </Button>
            <Button variant='ghost' className='pointer-events-none'>
              <Eye />
              {post.view}
            </Button>
          </CardFooter>
        </Card>
      ))}
      <p className='self-center'>完</p>
    </>
  );
}
