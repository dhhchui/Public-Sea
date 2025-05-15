// components/post-list.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

// 自訂 fetcher 函數給 useSWR 使用
const fetcher = async (url) => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`伺服器錯誤: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.posts || [];
};

export function PostList({ boardId }) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: posts = [], error } = useSWR(
    isMounted && boardId ? `/api/post-list?boardId=${boardId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 分鐘去重間隔
      fallbackData: [],
    }
  );

  if (error) {
    return <p className="text-center text-red-500">{error.message}</p>;
  }

  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <p className="text-center">未找到貼文。</p>
      ) : (
        posts.map((post) => (
          <div
            key={post.id}
            className="p-4 bg-white border rounded shadow-md cursor-pointer hover:bg-gray-50"
            onClick={() => {
              const url = `/view-post/${post.id}`; // 跳轉到 /view-post/[postId]
              console.log("Navigating to:", url);
              router.push(url);
            }}
          >
            <h3 className="text-xl font-bold">{post.title}</h3>
            <p className="text-gray-700">{post.content}</p>
            <p className="text-gray-500 text-sm">
              由 {post.author?.nickname || "未知"} 於{" "}
              {new Date(post.createdAt).toLocaleString()} 發佈
            </p>
            <p className="text-gray-500 text-sm">
              按讚數: {post.likeCount} | 瀏覽次數: {post.view}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
