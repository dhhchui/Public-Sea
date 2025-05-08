"use client";

import { useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CommentSection({ post, totalComments, board, postId }) {
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get("page")) || 1;
  const pageSize = 5;
  const totalPages = Math.ceil(totalComments / pageSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle>留言區 ({totalComments})</CardTitle>
      </CardHeader>
      <CardContent>
        {post.comments.length === 0 ? (
          <p className="text-gray-500">暫無留言，快來發表第一個吧！</p>
        ) : (
          <div className="space-y-2">
            {post.comments.map((comment) => (
              <div key={comment.id} className="border p-2 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">{comment.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  由 {comment.author?.username || "匿名"} 於 {comment.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={`/boards/${board}/${postId}?page=${currentPage > 1 ? currentPage - 1 : 1}`}
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, index) => (
                <PaginationItem key={index + 1}>
                  <PaginationLink
                    href={`/boards/${board}/${postId}?page=${index + 1}`}
                    isActive={currentPage === index + 1}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={`/boards/${board}/${postId}?page=${currentPage < totalPages ? currentPage + 1 : totalPages}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        <form className="mt-2 space-y-2">
          <Label htmlFor="comment">發表留言</Label>
          <Textarea
            id="comment"
            placeholder="輸入您的留言..."
            className="w-full"
            rows={3}
          />
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            提交留言
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}