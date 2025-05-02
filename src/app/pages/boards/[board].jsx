"use client";

import { useParams } from "next/navigation";
import { data } from "@/components/boards-data";
import { PostForm } from "@/components/post-form";
import { PostList } from "@/components/post-list";

export default function BoardPage() {
  const { board } = useParams();
  const decodedBoard = decodeURIComponent(board);

  // 檢查 board 是否有效
  const validBoard = data.navMain
    .flatMap((category) => category.items)
    .find((item) => item.title === decodedBoard);

  if (!validBoard) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">分區不存在</h1>
        <p>您訪問的分區 {decodedBoard} 不存在，請返回首頁。</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{decodedBoard}</h1>

      {/* 發帖表單 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">發表新帖</h2>
        <PostForm board={decodedBoard} />
      </div>

      {/* 帖子列表 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">最新帖子</h2>
        <PostList board={decodedBoard} />
      </div>
    </div>
  );
}
