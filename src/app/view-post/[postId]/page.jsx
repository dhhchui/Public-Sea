'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CommentList from '@/components/CommentList.jsx';
import LikeButton from '@/components/LikeButton.jsx';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Eye, MessageSquarePlus, SendHorizontal, Loader2 } from 'lucide-react';

export default function PostPage() {
  const [post, setPost] = useState(null);
  const [commentContent, setCommentContent] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const res = await fetch(`/api/view-post/${postId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
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
  }, [postId]);

  useEffect(() => {
    if (!post) return;

    const fetchLikeStatuses = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          console.log('No user in localStorage, skipping like status fetch');
          return;
        }

        const user = JSON.parse(storedUser);
        const token = localStorage.getItem('token');
        console.log('Token for like status fetch:', token);
        if (!token) {
          console.log('No token found, skipping like status fetch');
          return;
        }

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
          console.log('Like statuses fetched:', statusMap);
        } else {
          console.error(
            'Failed to fetch like statuses:',
            res.status,
            await res.text()
          );
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
    setSuccessMessage('');
    setIsSubmitting(true);

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setError('請先登入');
      setTimeout(() => router.push('/login'), 1000);
      setIsSubmitting(false);
      return;
    }

    let user;
    try {
      user = JSON.parse(storedUser);
    } catch (err) {
      console.error('解析 localStorage user 失敗:', err);
      setError('用戶數據無效，請重新登入');
      setTimeout(() => router.push('/login'), 1000);
      setIsSubmitting(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到認證憑證，請重新登入');
      setTimeout(() => router.push('/login'), 1000);
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
        setCommentContent('');
        setPost((prev) => ({
          ...prev,
          comments: [...prev.comments, data.comment],
        }));
        setLikeStatuses((prev) => ({
          ...prev,
          [`comment-${data.comment.id}`]: false,
        }));
        setSuccessMessage('留言已提交！');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || '提交留言失敗');
      }
    } catch (error) {
      console.error('錯誤提交留言:', error);
      setError('提交留言時發生錯誤，請再試一次。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className='flex justify-center items-center min-h-screen bg-gray-100'>
        <div className='w-full max-w-2xl p-6'>
          <p className='text-red-500 text-center'>{error}</p>
          <Button
            onClick={() => router.push(`/boards/${board}`)}
            className='w-full mt-4'
            variant='secondary'
          >
            返回貼文列表
          </Button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        載入中...
      </div>
    );
  }

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
                <BreadcrumbItem className='hidden md:block'>
                  <BreadcrumbLink href={`/boards/${board}`}>
                    {decodeURIComponent(board)}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className='hidden md:block' />
                <BreadcrumbItem>
                  <BreadcrumbPage>{post.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <MessageSquarePlus />
                  新增留言
                </Button>
              </DialogTrigger>
              <DialogContent className='flex flex-col sm:max-w-[425px] max-h-[96vh]'>
                <DialogHeader>
                  <DialogTitle>新增留言</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleCommentSubmit}
                  className='flex flex-col gap-4'
                >
                  <div className='flex-1 overflow-auto'>
                    <Textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder='撰寫您的留言...'
                      className='resize-none'
                      required
                      disabled={isSubmitting}
                    />
                    {error && <p className='text-red-500 mt-2'>{error}</p>}
                    {successMessage && (
                      <p className='text-green-500 mt-2'>{successMessage}</p>
                    )}
                  </div>
                  <Button
                    className='self-start'
                    type='submit'
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='animate-spin' /> 提交中
                      </>
                    ) : (
                      <>
                        <SendHorizontal /> 提交留言
                      </>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>
        <Separator />
      </div>
      <main className='flex flex-col gap-4 p-4'>
        <Card>
          <CardHeader>
            {/* <div className='flex items-center justify-between'> */}
            <Badge
              variant='secondary'
              className='cursor-pointer'
              onClick={() => router.push(`/user-profile/${post.authorId}`)}
            >
              {post.author.nickname || post.author.username}
            </Badge>
            <CardDescription>
              {new Date(post.createdAt).toLocaleString()}
            </CardDescription>
            <CardTitle className='text-lg'>{post.title}</CardTitle>
            {/* </div> */}
          </CardHeader>
          <CardContent>
            <p>{post.content}</p>
          </CardContent>
          <CardFooter className='flex gap-2'>
            <LikeButton
              itemId={post.id}
              itemType='post'
              initialLikeCount={post.likeCount}
              initialLiked={likeStatuses[`post-${post.id}`] || false}
            />
            <Button variant='ghost' className='pointer-events-none'>
              <Eye />
              {post.view}
            </Button>
          </CardFooter>
        </Card>
        <CommentList
          postId={parseInt(postId)}
          comments={post.comments}
          likeStatuses={likeStatuses}
        />
        {/* <Button
          onClick={() => router.push(`/boards/${board}`)}
          className='w-full max-w-md mt-4'
          variant='secondary'
        >
          返回貼文列表
        </Button> */}
        <p className='self-center'>完</p>
      </main>
    </>
  );
}

// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { useRouter, useParams } from 'next/navigation';
// import CommentList from '@/components/CommentList.jsx';
// import LikeButton from '@/components/LikeButton.jsx';

// export default function PostPage() {
//   const [post, setPost] = useState(null);
//   const [commentContent, setCommentContent] = useState('');
//   const [error, setError] = useState('');
//   const [successMessage, setSuccessMessage] = useState('');
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [likeStatuses, setLikeStatuses] = useState({});
//   const router = useRouter();
//   const params = useParams();
//   const { postId, board } = params;
//   const hasFetched = useRef(false);

//   useEffect(() => {
//     if (hasFetched.current) return;
//     hasFetched.current = true;

//     const fetchPost = async () => {
//       console.log('Fetching post with params:', { board, postId });
//       try {
//         const res = await fetch(`/api/view-post/${postId}`, {
//           method: 'GET',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
//           },
//         });
//         const data = await res.json();
//         console.log('API response:', data);
//         if (res.ok) {
//           setPost(data.post);
//         } else {
//           setError(data.message || '無法載入貼文');
//         }
//       } catch (error) {
//         console.error('錯誤載入貼文:', error);
//         setError('錯誤載入貼文: ' + error.message);
//       }
//     };

//     fetchPost();
//   }, [postId]);

//   useEffect(() => {
//     if (!post) return;

//     const fetchLikeStatuses = async () => {
//       try {
//         const storedUser = localStorage.getItem('user');
//         if (!storedUser) {
//           console.log('No user in localStorage, skipping like status fetch');
//           return;
//         }

//         const user = JSON.parse(storedUser);
//         const token = localStorage.getItem('token');
//         console.log('Token for like status fetch:', token);
//         if (!token) {
//           console.log('No token found, skipping like status fetch');
//           return;
//         }

//         const items = [
//           { itemId: post.id, itemType: 'post' },
//           ...post.comments.map((comment) => ({
//             itemId: comment.id,
//             itemType: 'comment',
//           })),
//         ];

//         const res = await fetch('/api/like-status/batch', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({ items }),
//         });

//         if (res.ok) {
//           const data = await res.json();
//           const statusMap = data.statuses.reduce((acc, status) => {
//             const key = `${status.itemType}-${status.itemId}`;
//             acc[key] = status.liked;
//             return acc;
//           }, {});
//           setLikeStatuses(statusMap);
//           console.log('Like statuses fetched:', statusMap);
//         } else {
//           console.error(
//             'Failed to fetch like statuses:',
//             res.status,
//             await res.text()
//           );
//         }
//       } catch (error) {
//         console.error('錯誤載入按讚狀態:', error);
//       }
//     };

//     fetchLikeStatuses();
//   }, [post]);

//   const handleCommentSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setSuccessMessage('');
//     setIsSubmitting(true);

//     const storedUser = localStorage.getItem('user');
//     if (!storedUser) {
//       setError('請先登入');
//       setTimeout(() => router.push('/login'), 1000);
//       setIsSubmitting(false);
//       return;
//     }

//     let user;
//     try {
//       user = JSON.parse(storedUser);
//     } catch (err) {
//       console.error('解析 localStorage user 失敗:', err);
//       setError('用戶數據無效，請重新登入');
//       setTimeout(() => router.push('/login'), 1000);
//       setIsSubmitting(false);
//       return;
//     }

//     const token = localStorage.getItem('token');
//     if (!token) {
//       setError('未找到認證憑證，請重新登入');
//       setTimeout(() => router.push('/login'), 1000);
//       setIsSubmitting(false);
//       return;
//     }

//     try {
//       const res = await fetch('/api/comment', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           postId: parseInt(postId),
//           content: commentContent,
//         }),
//       });

//       const data = await res.json();
//       if (res.ok) {
//         setCommentContent('');
//         setPost((prev) => ({
//           ...prev,
//           comments: [...prev.comments, data.comment],
//         }));
//         setLikeStatuses((prev) => ({
//           ...prev,
//           [`comment-${data.comment.id}`]: false,
//         }));
//         setSuccessMessage('留言已提交！');
//         setTimeout(() => setSuccessMessage(''), 3000);
//       } else {
//         setError(data.message || '提交留言失敗');
//       }
//     } catch (error) {
//       console.error('錯誤提交留言:', error);
//       setError('提交留言時發生錯誤，請再試一次。');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (error) {
//     return (
//       <div className='w-full min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6'>
//         <div className='w-full max-w-md'>
//           <p className='text-red-500 text-center'>{error}</p>
//           <button
//             onClick={() => router.push(`/boards/${board}`)}
//             className='w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600'
//           >
//             返回貼文列表
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (!post) {
//     return (
//       <div className='w-full min-h-screen flex items-center justify-center'>
//         載入中...
//       </div>
//     );
//   }

//   return (
//     <div className='w-full min-h-screen bg-gray-100 flex flex-col p-6'>
//       <div className='w-full flex flex-col'>
//         <h2 className='text-2xl font-bold mb-4'>{post.title}</h2>
//         <p className='text-gray-700 mb-4'>{post.content}</p>
//         <p className='text-gray-500 text-sm mb-2'>
//           由{' '}
//           <span
//             onClick={() => router.push(`/user-profile/${post.authorId}`)}
//             className='cursor-pointer text-blue-500 hover:underline'
//           >
//             {post.author.nickname}
//           </span>{' '}
//           於 {new Date(post.createdAt).toLocaleString()} 發佈
//         </p>
//         <p className='text-gray-500 text-sm mb-2'>👁️ {post.view}</p>
//         <div className='flex items-center mb-4'>
//           <LikeButton
//             itemId={post.id}
//             itemType='post'
//             initialLikeCount={post.likeCount}
//             initialLiked={likeStatuses[`post-${post.id}`] || false}
//           />
//         </div>
//         <div className='w-full mb-4'>
//           <h3 className='text-lg font-bold mb-2'>新增留言</h3>
//           {error && <p className='text-red-500 mb-2'>{error}</p>}
//           {successMessage && (
//             <p className='text-green-500 mb-2'>{successMessage}</p>
//           )}
//           <form onSubmit={handleCommentSubmit} className='w-full max-w-md'>
//             <textarea
//               value={commentContent}
//               onChange={(e) => setCommentContent(e.target.value)}
//               placeholder='撰寫您的留言...'
//               className='w-full p-2 border rounded mb-2'
//               rows='3'
//               required
//               disabled={isSubmitting}
//             />
//             <button
//               type='submit'
//               className={`w-full p-2 rounded text-white ${
//                 isSubmitting
//                   ? 'bg-blue-300 cursor-not-allowed'
//                   : 'bg-blue-500 hover:bg-blue-600'
//               }`}
//               disabled={isSubmitting}
//             >
//               {isSubmitting ? '提交中...' : '提交留言'}
//             </button>
//           </form>
//         </div>
//         <div className='w-full'>
//           <CommentList
//             postId={parseInt(postId)}
//             comments={post.comments}
//             likeStatuses={likeStatuses}
//           />
//         </div>
//         <button
//           onClick={() => router.push(`/boards/${board}`)}
//           className='w-full max-w-md p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600'
//         >
//           返回貼文列表
//         </button>
//       </div>
//     </div>
//   );
// }
