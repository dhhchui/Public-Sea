"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import LikeButton from "./LikeButton";

export default function CommentList({
  postId,
  comments: initialComments,
  likeStatuses,
}) {
  const [comments, setComments] = useState(initialComments || []);
  const router = useRouter();

  return (
    <div className="mt-4 w-full">
      <h3 className="text-lg font-bold mb-2">留言</h3>
      {comments.length === 0 ? (
        <p className="text-gray-500">尚未有留言。</p>
      ) : (
        comments.map((comment) => (
          <div
            key={comment.id}
            className={`p-4 border-b ${
              comment.isCollapsed ? "opacity-50" : ""
            }`}
          >
            <div className="flex justify-between items-center">
              <span
                onClick={() => router.push(`/user-profile/${comment.authorId}`)}
                className={`cursor-pointer text-blue-500 hover:underline flex items-center ${
                  comment.isCollapsed ? "text-red-500" : ""
                }`}
              >
                {comment.author?.nickname || "匿名用戶"}
                {comment.isCollapsed && (
                  <Flag className="ml-1 h-4 w-4 text-red-500" />
                )}
              </span>
              {comment.isCollapsed && (
                <span className="text-red-500 text-sm">被限制用戶</span>
              )}
            </div>
            <p>{comment.content}</p>
            <p className="text-gray-500 text-sm">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
            <div className="flex items-center mt-1">
              <LikeButton
                itemId={comment.id}
                itemType="comment"
                initialLikeCount={comment.likeCount || 0}
                initialLiked={likeStatuses[`comment-${comment.id}`] || false}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}