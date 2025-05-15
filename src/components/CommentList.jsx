"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flag, ChevronDown, ChevronUp } from "lucide-react";
import LikeButton from "./LikeButton";

export default function CommentList({
  postId,
  comments: initialComments,
  likeStatuses,
}) {
  const [comments, setComments] = useState(initialComments || []);
  const [collapsedStates, setCollapsedStates] = useState(
    initialComments.reduce((acc, comment) => {
      acc[comment.id] =
        comment.isCollapsed || comment.author?.isRedFlagged || false;
      return acc;
    }, {})
  );
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setComments(initialComments || []);
    setCollapsedStates((prev) => {
      const newStates = { ...prev };
      initialComments.forEach((comment) => {
        if (!(comment.id in newStates)) {
          newStates[comment.id] =
            comment.isCollapsed || comment.author?.isRedFlagged || false;
        }
      });
      return newStates;
    });
  }, [initialComments]);

  const toggleCollapse = (commentId) => {
    setCollapsedStates((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  if (!isMounted) {
    return null;
  }

  console.log("CommentList received comments:", comments);
  console.log("CommentList received likeStatuses:", likeStatuses);
  console.log("CommentList collapsedStates:", collapsedStates);

  return (
    <div className="mt-4 w-full">
      <h3 className="text-lg font-bold mb-2">留言</h3>
      {comments.length === 0 ? (
        <p className="text-gray-500">尚未有留言。</p>
      ) : (
        comments.map((comment) => {
          const isCollapsed = collapsedStates[comment.id];
          const isRedFlagged = comment.author?.isRedFlagged;

          return (
            <div
              key={comment.id}
              className={`p-4 border-b ${
                isRedFlagged && isCollapsed ? "opacity-50" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    onClick={() =>
                      router.push(`/user-profile/${comment.authorId}`)
                    }
                    className={`cursor-pointer text-blue-500 hover:underline flex items-center ${
                      isRedFlagged ? "text-red-500" : ""
                    }`}
                  >
                    {comment.author?.nickname || "匿名用戶"}
                    {isRedFlagged && (
                      <Flag className="ml-1 h-4 w-4 text-red-500" />
                    )}
                  </span>
                  {isRedFlagged && (
                    <button
                      onClick={() => toggleCollapse(comment.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                {isRedFlagged && isCollapsed && (
                  <span className="text-red-500 text-sm">被限制用戶</span>
                )}
              </div>
              {!isCollapsed && (
                <>
                  <p className="mt-2">{comment.content}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                  <div className="flex items-center mt-1">
                    <LikeButton
                      itemId={comment.id}
                      itemType="comment"
                      initialLikeCount={comment.likeCount || 0}
                      initialLiked={
                        likeStatuses[`comment-${comment.id}`] || false
                      }
                    />
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
