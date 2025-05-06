"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LikeButton from "./LikeButton";

export default function CommentList({
  postId,
  comments: initialComments,
  likeStatuses,
}) {
  const [comments, setComments] = useState(initialComments || []);
  const router = useRouter();

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold mb-2">留言</h3>
      {comments.length === 0 ? (
        <p className="text-gray-500">尚未有留言。</p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="p-2 border-b">
            <span
              onClick={() => router.push(`/user-profile/${comment.authorId}`)}
              className="cursor-pointer text-blue-500 hover:underline"
            >
              {comment.author.username}
            </span>
            <p>{comment.content}</p>
            <p className="text-gray-500 text-sm">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
            <div className="flex items-center mt-1">
              <LikeButton
                itemId={comment.id}
                itemType="comment"
                initialLikeCount={comment.likeCount}
                initialLiked={likeStatuses[`comment-${comment.id}`] || false}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}