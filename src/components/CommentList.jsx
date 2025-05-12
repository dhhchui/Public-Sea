'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LikeButton from './LikeButton';
import { Badge } from '@/components/ui/badge';
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

export default function CommentList({
  comments: initialComments,
  likeStatuses,
}) {
  const [comments, setComments] = useState(initialComments || []);
  const router = useRouter();
  const sortComments = (order) => {
    const sortedComments = [...comments].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setComments(sortedComments);
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
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
        comments.map((comment) => (
          <Card key={comment.id}>
            <CardHeader>
              <Badge
                variant='outline'
                className='cursor-pointer'
                onClick={() => router.push(`/user-profile/${comment.authorId}`)}
              >
                {comment.author.username}
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
                initialLiked={likeStatuses[`comment-${comment.id}`] || false}
              />
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
}
