"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PostList } from "@/components/post-list";

export default function BoardContent({ board, boardData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");
  const boardTitle = boardData ? boardData.name : board; // 使用 name 而非 title

  useEffect(() => {
    if (postId) {
      router.push(`/boards/${board}/posts/${postId}`);
    }
  }, [postId, board, router]);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="bg-white p-2 rounded shadow flex-1 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-2">話題列表（{boardTitle}）</h2>
        <PostList boardId={boardData?.id} />
      </div>
    </div>
  );
}
