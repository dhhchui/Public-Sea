'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CommentList from '@/components/CommentList.jsx';
import LikeButton from '@/components/LikeButton.jsx';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function PostPage() {
  const [post, setPost] = useState(null);
  const [commentContent, setCommentContent] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // 新增成功提示狀態
  const [isSubmitting, setIsSubmitting] = useState(false); // 新增提交狀態
  const [likeStatuses, setLikeStatuses] = useState({});
  const router = useRouter();
  const params = useParams();
  const { postId, board } = params;
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchPost = async () => {
      console.log('Fetching post with params:', { board, postId });
      try {
        const res = await fetch(`/api/boards/${board}/posts/${postId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        console.log('API response:', data);
        if (res.ok) {
          setPost(data.post);
        } else {
          setError(data.message || '無法載入貼文');
        }
      } catch (error) {
        console.error('錯誤載入貼文:', error);
        setError('錯誤載入貼文: ' + error.message);
      }
    };

    fetchPost();
  }, [postId, board]);

  useEffect(() => {
    if (!post) return;

    const fetchLikeStatuses = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;

        const user = JSON.parse(storedUser);
        const token = user?.token;
        if (!token) return;

        const items = [
          { itemId: post.id, itemType: 'post' },
          ...post.comments.map((comment) => ({
            itemId: comment.id,
            itemType: 'comment',
          })),
        ];

        const res = await fetch('/api/like-status/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items }),
        });

        if (res.ok) {
          const data = await res.json();
          const statusMap = data.statuses.reduce((acc, status) => {
            const key = `${status.itemType}-${status.itemId}`;
            acc[key] = status.liked;
            return acc;
          }, {});
          setLikeStatuses(statusMap);
        }
      } catch (error) {
        console.error('錯誤載入按讚狀態:', error);
      }
    };

    fetchLikeStatuses();
  }, [post]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage(''); // 清空之前的成功訊息
    setIsSubmitting(true); // 設置提交狀態為 true

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      setIsSubmitting(false);
      return;
    }

    const user = JSON.parse(storedUser);
    const token = user?.token;
    if (!token) {
      router.push('/login');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: parseInt(postId),
          content: commentContent,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCommentContent(''); // 清空輸入框
        setPost((prev) => ({
          ...prev,
          comments: [...prev.comments, data.comment],
        }));
        setLikeStatuses((prev) => ({
          ...prev,
          [`comment-${data.comment.id}`]: false,
        }));
        setSuccessMessage('留言已提交！'); // 顯示成功提示
        // 3 秒後隱藏成功訊息
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('錯誤提交留言:', error);
      setError('提交留言時發生錯誤，請再試一次。');
    } finally {
      setIsSubmitting(false); // 提交完成，恢復按鈕狀態
    }
  };

  if (error) {
    return (
      <div className='flex justify-center items-center min-h-screen bg-gray-100'>
        <div className='w-full max-w-2xl p-6'>
          <p className='text-red-500 text-center'>{error}</p>
          <button
            onClick={() => router.push(`/boards/${board}`)}
            className='w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600'
          >
            返回貼文列表
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div>載入中...</div>;
  }

  return (
    <>
      <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
        <div className='flex items-center gap-2 px-4'>
          <SidebarTrigger className='-ml-1' />
          <Separator
            orientation='vertical'
            className='mr-2 data-[orientation=vertical]:h-4'
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className='hidden md:block'>
                <BreadcrumbLink href='#'>
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className='hidden md:block' />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      {/* <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
              <div className='grid auto-rows-min gap-4 md:grid-cols-3'>
              <div className='bg-muted/50 aspect-video rounded-xl' />
              <div className='bg-muted/50 aspect-video rounded-xl' />
              <div className='bg-muted/50 aspect-video rounded-xl' />
              </div>
              <div className='bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min' />
              </div> */}
      <div className='flex justify-center items-center min-h-screen bg-gray-100'>
        <div className='w-full max-w-2xl p-6'>
          <h2 className='text-2xl font-bold mb-4'>{post.title}</h2>
          <p className='text-gray-700 mb-4'>{post.content}</p>
          <p className='text-gray-500 text-sm mb-2'>
            由{' '}
            <span
              onClick={() => router.push(`/user-profile/${post.authorId}`)}
              className='cursor-pointer text-blue-500 hover:underline'
            >
              {post.author.username}
            </span>{' '}
            於 {new Date(post.createdAt).toLocaleString()} 發佈
          </p>
          <p className='text-gray-500 text-sm mb-2'>👁️ {post.view}</p>
          <div className='flex items-center mb-4'>
            <LikeButton
              itemId={post.id}
              itemType='post'
              initialLikeCount={post.likeCount}
              initialLiked={likeStatuses[`post-${post.id}`] || false}
            />
          </div>
          <div className='mb-4'>
            <h3 className='text-lg font-bold mb-2'>新增留言</h3>
            {error && <p className='text-red-500 mb-2'>{error}</p>}
            {successMessage && (
              <p className='text-green-500 mb-2'>{successMessage}</p>
            )}
            <form onSubmit={handleCommentSubmit}>
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder='撰寫您的留言...'
                className='w-full p-2 border rounded mb-2'
                rows='3'
                required
                disabled={isSubmitting} // 提交期間禁用輸入框
              />
              <button
                type='submit'
                className={`w-full p-2 rounded text-white ${
                  isSubmitting
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                disabled={isSubmitting} // 提交期間禁用按鈕
              >
                {isSubmitting ? '提交中...' : '提交留言'}
              </button>
            </form>
          </div>
          <CommentList
            postId={parseInt(postId)}
            comments={post.comments}
            likeStatuses={likeStatuses}
          />
          <button
            onClick={() => router.push(`/boards/${board}`)}
            className='w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600'
          >
            返回貼文列表
          </button>
        </div>
      </div>
    </>
  );
}
