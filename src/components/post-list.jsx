"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";

// 使用真實的 boardId 映射表
const boardIdMap = {
  吹水台: 1,
  管理台: 2,
  學術台: 3,
  時事台: 4,
  財經台: 5,
  手機台: 6,
  電腦台: 7,
  飲食台: 8,
  上班台: 9,
  旅遊台: 10,
  校園台: 11,
  體育台: 12,
  遊戲台: 13,
  影視台: 14,
  音樂台: 15,
  感情台: 16,
};

// 自訂 fetcher 函數給 useSWR 使用
const fetcher = async (url) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      response.status === 404
        ? "無法找到話題 API，請檢查伺服器配置"
        : `伺服器錯誤: ${response.status} - ${text}`
    );
  }

  const data = await response.json();
  return data.posts || [];
};

// 定義快取鍵生成函數，以便外部觸發重新驗證
export const getPostListCacheKey = (boardId) => {
  return boardId ? `posts:${boardId}` : null;
};

export function PostList({ board }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const boardId = boardIdMap[board];
  console.log("Board:", board, "BoardId:", boardId);
  const cacheKey = getPostListCacheKey(boardId);

  const { data: posts, error: fetchError } = useSWR(
    cacheKey,
    () => {
      if (!boardId) {
        throw new Error("無效的分區");
      }
      const url = `/api/post-list?boardId=${boardId}`;
      console.log("Fetching posts from:", url);
      return fetcher(url);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  useEffect(() => {
    if (fetchError) {
      console.error("Fetch error details:", fetchError); // 添加詳細錯誤日誌
      setError(fetchError.message);
      setIsLoading(false);
    } else if (posts) {
      console.log("Posts loaded:", posts); // 添加日誌
      setIsLoading(false);
    }
  }, [fetchError, posts]);

  if (isLoading) {
    return <div className="text-gray-500">載入中...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        載入話題失敗：{error}
        {error.includes("404") && (
          <p className="mt-1 text-sm">
            請確認 <code>app/api/post-list/route.js</code> 是否存在並正確配置。
          </p>
        )}
        <p className="mt-1 text-sm">請檢查終端日誌以獲取更多錯誤訊息。</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return <p className="text-gray-500">目前還沒有話題，快來發表第一個吧！</p>;
  }

  return (
    <div>
      <div className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="border rounded p-2 hover:bg-gray-50 transition-all duration-200"
          >
            <Link href={`/view-post/${post.id}`}>
              <h3 className="text-lg font-semibold hover:text-blue-600">
                {post.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                作者: {post.author?.nickname || "未知"} • 瀏覽: {post.view} •
                讚: {post.likeCount}
              </p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
