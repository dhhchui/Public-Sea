"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PostPage() {
  const { board, postId } = useParams();
  const decodedBoard = decodeURIComponent(board);
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}`);
        const data = await response.json();
        if (response.ok) {
          setPost(data.post);
        } else {
          console.error("獲取帖子失敗:", data.message);
        }
      } catch (error) {
        console.error("網絡錯誤:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (isLoading) {
    return <div>載入中...</div>;
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">帖子不存在</h1>
        <p>您訪問的帖子不存在或已被刪除。</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{post.title}</h1>

      <div className="mb-4 text-sm text-gray-500">
        <span>分區: {decodedBoard}</span> •
        <span>作者: {post.author?.username || "匿名"}</span> •
        <span>瀏覽: {post.view}</span> •<span>讚: {post.likeCount}</span>
      </div>

      <div className="prose max-w-none">
        <p>{post.content}</p>
      </div>
    </div>
  );
}
