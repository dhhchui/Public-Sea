"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PostForm } from "@/components/post-form";
import { PostList } from "@/components/post-list";

export default function BoardContent({ board }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");

  useEffect(() => {
    if (postId) {
      router.push(`/boards/${board}/posts/${postId}`);
    }
  }, [postId, board, router]);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="bg-white p-2 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">發布話題</h2>
        <PostForm board={board} />
      </div>
      <div className="bg-white p-2 rounded shadow flex-1 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-2">話題列表</h2>
        <PostList board={board} />
      </div>
    </div>
  );
}