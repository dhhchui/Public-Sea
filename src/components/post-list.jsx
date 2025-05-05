"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function PostList({ board }) {
  const [posts, setPosts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get("page")) || 1;
  const pageSize = 10;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const url = `/api/posts?board=${encodeURIComponent(board)}&page=${currentPage}&pageSize=${pageSize}`;
        const response = await fetch(url);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            response.status === 404
              ? "無法找到帖子 API，請檢查伺服器配置"
              : `伺服器錯誤: ${response.status}`
          );
        }

        const data = await response.json();
        setPosts(data.posts || []);
        const count = Number(data.totalCount) || 0;
        setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [board, currentPage]);

  if (isLoading) {
    return <div className="text-gray-500">載入中...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        載入話題失敗：{error}
        {error.includes("404") && (
          <p className="mt-1 text-sm">
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
    <div>
      <div className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="border rounded p-2 hover:bg-gray-50 transition-all duration-200"
          >
            <Link href={`/boards/${board}?postId=${post.id}`}>
              <h3 className="text-lg font-semibold hover:text-blue-600">
                {post.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                作者: {post.author?.username || "匿名"} • 瀏覽: {post.view} • 讚: {post.likeCount}
              </p>
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/boards/${board}?page=${currentPage > 1 ? currentPage - 1 : 1}`}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, index) => (
              <PaginationItem key={index + 1}>
                <PaginationLink
                  href={`/boards/${board}?page=${index + 1}`}
                  isActive={currentPage === index + 1}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={`/boards/${board}?page=${currentPage < totalPages ? currentPage + 1 : totalPages}`}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}