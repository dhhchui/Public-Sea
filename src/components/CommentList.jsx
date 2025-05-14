'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LikeButton from './LikeButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronUp, Flag } from 'lucide-react';

export default function CommentList({
  comments: initialComments,
  likeStatuses,
}) {
  const [comments, setComments] = useState(initialComments || []);
  // 為每個留言維護摺疊狀態，紅旗用戶預設摺疊
  //初始值根據 comment.author?.isRedFlagged 設置：紅旗用戶預設摺疊（true），其他用戶預設展開（false）。
  // const [collapsedStates, setCollapsedStates] = useState(
  //   initialComments.reduce((acc, comment) => {
  //     acc[comment.id] = comment.author?.isRedFlagged || false;
  //     return acc;
  //   }, {})
  // );
  const router = useRouter();
  const sortComments = (order) => {
    const sortedComments = [...comments].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setComments(sortedComments);
  };

  // const toggleCollapse = (commentId) => {
  //   setCollapsedStates((prev) => ({
  //     ...prev,
  //     [commentId]: !prev[commentId],
  //   }));
  // };

  return (
    <div className='flex flex-col gap-4'>
      <div className='px-6 flex items-center justify-between'>
        <p className='text-lg font-bold'>留言</p>
        <Select
          onValueChange={(value) => sortComments(value)}
          defaultValue='desc'
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='desc'>由新至舊</SelectItem>
            <SelectItem value='asc'>由舊至新</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {comments.length === 0 ? (
        <p>尚未有留言。</p>
      ) : (
        comments.map((comment) => {
          // 根據摺疊狀態和紅旗用戶狀態來決定是否顯示留言內容
          // const isCollapsed = collapsedStates[comment.id];
          const isRedFlagged = comment.author?.isRedFlagged;

          return (
            <div
              key={comment.id}
              // className={`p-4 border-b ${
              //   isRedFlagged && isCollapsed ? 'opacity-50' : ''
              // }`}
            >
              {/* <div className='flex justify-between items-center'>
                <div className='flex items-center gap-2'> */}
              {/* <span
                    onClick={() =>
                      router.push(`/user-profile/${comment.authorId}`)
                    }
                    className={`cursor-pointer text-blue-500 hover:underline flex items-center ${
                      isRedFlagged ? 'text-red-500' : ''
                    }`}
                  >
                    {comment.author?.nickname || '匿名用戶'}
                    {isRedFlagged && (
                      <Flag className='ml-1 h-4 w-4 text-red-500' />
                    )}
                  </span> */}
              {isRedFlagged && (
                <>
                  {/* <button
                        onClick={() => toggleCollapse(comment.id)}
                        className='text-gray-500 hover:text-gray-700'
                      >
                        {isCollapsed ? (
                          <ChevronDown className='h-4 w-4' />
                        ) : (
                          <ChevronUp className='h-4 w-4' />
                        )}
                      </button> */}
                  <Accordion className='px-6' type='single' collapsible>
                    <AccordionItem value='item-1'>
                      <AccordionTrigger className='hover:no-underline'>
                        <div className='flex items-center gap-2'>
                          <Badge
                            className='cursor-pointer'
                            variant='secondary'
                            onClick={() =>
                              router.push(`/user-profile/${comment.authorId}`)
                            }
                          >
                            {comment.author?.nickname || '匿名用戶'}
                          </Badge>
                          <Badge variant='outline'>被限制用戶</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className='flex flex-col gap-6'>
                          <p className='text-sm'>
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                          <p className='text-base whitespace-pre-line'>
                            {comment.content}
                          </p>
                          <LikeButton
                            itemId={comment.id}
                            itemType='comment'
                            initialLikeCount={comment.likeCount}
                            initialLiked={
                              likeStatuses[`comment-${comment.id}`] || false
                            }
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              )}
              {/* </div>
              </div> */}
              {!isRedFlagged && (
                // <>
                //   <p className='mt-2'>{comment.content}</p>
                //   <p className='text-gray-500 text-sm mt-1'>
                //     {new Date(comment.createdAt).toLocaleString()}
                //   </p>
                //   <div className='flex items-center mt-1'>
                //     <LikeButton
                //       itemId={comment.id}
                //       itemType='comment'
                //       initialLikeCount={comment.likeCount || 0}
                //       initialLiked={
                //         likeStatuses[`comment-${comment.id}`] || false
                //       }
                //     />
                //   </div>
                <Card key={comment.id}>
                  <CardHeader>
                    <Badge
                      variant='secondary'
                      className='cursor-pointer'
                      onClick={() =>
                        router.push(`/user-profile/${comment.authorId}`)
                      }
                    >
                      {comment.author?.nickname || '匿名用戶'}
                    </Badge>
                    <CardDescription>
                      {new Date(comment.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className='whitespace-pre-line'>{comment.content}</p>
                  </CardContent>
                  <CardFooter>
                    <LikeButton
                      itemId={comment.id}
                      itemType='comment'
                      initialLikeCount={comment.likeCount}
                      initialLiked={
                        likeStatuses[`comment-${comment.id}`] || false
                      }
                    />
                  </CardFooter>
                </Card>
                // </>
              )}
            </div>
          );
        })
        // comments.map((comment) => (
        //   <Card key={comment.id}>
        //     <CardHeader>
        //       <Badge
        //         variant='outline'
        //         className='cursor-pointer'
        //         onClick={() => router.push(`/user-profile/${comment.authorId}`)}
        //       >
        //         {comment.author.username}
        //       </Badge>
        //       <CardDescription>
        //         {new Date(comment.createdAt).toLocaleString()}
        //       </CardDescription>
        //     </CardHeader>
        //     <CardContent>
        //       <p className='whitespace-pre-line'>{comment.content}</p>
        //     </CardContent>
        //     <CardFooter>
        //       <LikeButton
        //         itemId={comment.id}
        //         itemType='comment'
        //         initialLikeCount={comment.likeCount}
        //         initialLiked={likeStatuses[`comment-${comment.id}`] || false}
        //       />
        //     </CardFooter>
        //   </Card>
        // ))
      )}
    </div>
  );
}
