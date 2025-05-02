"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function PostList({ board }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        console.log("Fetching posts for board:", board);
        const url = `/api/posts?board=${encodeURIComponent(board)}`;
        console.log("Request URL:", url);
        const response = await fetch(url);

        if (!response.ok) {
          const text = await response.text();
          console.log("Non-OK response:", response.status, text);
          throw new Error(
            response.status === 404
              ? "無法找到帖子 API，請檢查伺服器配置"
              : `伺服器錯誤: ${response.status}`
          );
        }

        const data = await response.json();
        console.log("Fetched posts:", data.posts.length, data.posts);
        setPosts(data.posts);
      } catch (error) {
        console.error("網絡錯誤:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [board]);

  if (isLoading) {
    return <div className="text-gray-500">載入中...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        載入話題失敗：{error}
        {error.includes("404") && (
          <p className="mt-2 text-sm">
            請確認 <code>app/api/posts/route.js</code> 是否存在並正確配置。
          </p>
        )}
      </div>
    );
  }

  if (posts.length === 0) {
    return <p className="text-gray-500">目前還沒有話題，快來發表第一個吧！</p>;
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
              作者: {post.author?.username || "匿名"} • 瀏覽: {post.view} • 讚: {post.likeCount}
            </p>
            <p className="mt-2 line-clamp-2">{post.content}</p>
          </Link>
        </div>
      ))}
    </div>
  );
}