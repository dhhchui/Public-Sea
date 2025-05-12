'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThumbsUp } from 'lucide-react';

export default function LikeButton({
  itemId,
  itemType,
  initialLikeCount,
  initialLiked,
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    console.log('Initial localStorage check:', {
      user: localStorage.getItem('user'),
      token: localStorage.getItem('token'),
    });
    setLiked(initialLiked);
    setLikeCount(initialLikeCount);
  }, [initialLiked, initialLikeCount]);

  const handleLike = async () => {
    console.log('handleLike called with:', { itemId, itemType, liked });
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setError('請先登入');
      console.log('No user in localStorage, redirecting to /login');
      setTimeout(() => router.push('/login'), 1000);
      return;
    }

    let user;
    try {
      user = JSON.parse(storedUser);
    } catch (err) {
      console.error('解析 localStorage user 失敗:', err);
      setError('用戶數據無效，請重新登入');
      setTimeout(() => router.push('/login'), 1000);
      return;
    }

    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token);
    if (!token) {
      setError('未找到認證憑證，請重新登入');
      console.log('No token found, redirecting to /login');
      setTimeout(() => router.push('/login'), 1000);
      return;
    }

    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId,
          itemType,
          action: liked ? 'unlike' : 'like',
        }),
      });

      const data = await res.json();
      console.log('API response:', { status: res.status, data });

      if (res.ok) {
        setLiked(!liked);
        setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
        setError('');
        console.log('按讚操作成功:', data.message);
      } else {
        setError(data.message || '按讚操作失敗');
        if (res.status === 401) {
          console.error('無效或過期 token，重新登錄');
          setError('認證已過期，請重新登入');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setTimeout(() => router.push('/login'), 1000);
        } else if (res.status === 404) {
          setError(`${itemType} 不存在`);
          console.log(`${itemType} not found for itemId: ${itemId}`);
        } else {
          console.log('其他錯誤:', data.message);
        }
      }
    } catch (error) {
      console.error('按讚錯誤:', error);
      setError('按讚時發生錯誤，請稍後再試');
    }
  };

  return (
    <div className='flex items-center space-x-2'>
      <Button
        onClick={handleLike}
        // className={`p-1 rounded-full ${
        //   liked ? 'text-red-500' : 'text-gray-500'
        // } hover:bg-gray-100`}
        className='cursor-pointer'
        variant={liked ? '' : 'outline'}
      >
        <ThumbsUp /> {likeCount}
      </Button>
      {error && <p className='text-red-500 text-sm'>{error}</p>}
    </div>
  );
}
