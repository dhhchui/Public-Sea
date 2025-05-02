"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function PostList({ board }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(
          `/api/posts?board=${encodeURIComponent(board)}`
        );
        const data = await response.json();
        if (response.ok) {
          setPosts(data.posts);
        } else {
          console.error("獲取帖子失敗:", data.message);
        }
      } catch (error) {
        console.error("網絡錯誤:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [board]);

  if (isLoading) {
    return <div>載入中...</div>;
  }

  if (posts.length === 0) {
    return <p>目前還沒有帖子，快來發表第一個吧！</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <Link href={`/boards/${board}/${post.id}`}>
            <h3 className="text-lg font-semibold hover:text-blue-600">
              {post.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              作者: {post.author?.username || "匿名"} • 瀏覽: {post.view} • 讚:{" "}
              {post.likeCount}
            </p>
            <p className="mt-2 line-clamp-2">{post.content}</p>
          </Link>
        </div>
      ))}
    </div>
  );
}
