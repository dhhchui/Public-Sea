"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, ThumbsUp } from "lucide-react";

// 使用真實的 boardId 映射表
const boardIdMap = {
  吹水台: 1,
  管理台: 17,
  學術台: 2,
  時事台: 3,
  財經台: 4,
  手機台: 5,
  電腦台: 6,
  飲食台: 7,
  上班台: 8,
  旅遊台: 9,
  校園台: 10,
  體育台: 11,
  遊戲台: 12,
  影視台: 13,
  音樂台: 14,
  感情台: 15,
  寵物台: 16,
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
        ? "無法找到貼文 API，請檢查伺服器配置"
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

  const router = useRouter();

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
        載入貼文失敗：{error}
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
    return <p className="text-gray-500">目前還沒有貼文，快來發表第一個吧！</p>;
  }

  return (
    <>
      {posts.map((post) => (
        <Card
          key={post.id}
          className="cursor-pointer"
          onClick={() => router.push(`/view-post/${post.id}`)}
        >
          <CardHeader>
            <Badge variant="secondary">
              {post.author.nickname || post.author.username}
            </Badge>
            <CardDescription>
              {new Date(post.createdAt).toLocaleString()}
            </CardDescription>
            <CardTitle className="text-lg">{post.title}</CardTitle>
          </CardHeader>
          {/* <CardContent>
              <p>{post.content}</p>
            </CardContent> */}
          <CardFooter className="flex gap-2">
            <Button variant="ghost" className="pointer-events-none">
              <ThumbsUp />
              {post.likeCount}
            </Button>
            <Button variant="ghost" className="pointer-events-none">
              <Eye />
              {post.view}
            </Button>
          </CardFooter>
        </Card>
      ))}
      <p className="self-center">完</p>
    </>
  );
}
