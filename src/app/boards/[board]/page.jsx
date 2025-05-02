import { notFound } from "next/navigation";
import { navMain } from "@/lib/boards";
import { PostForm } from "@/components/post-form";
import { PostList } from "@/components/post-list";

export async function generateStaticParams() {
  const params = [];
  navMain.forEach((category) => {
    category.items.forEach((board) => {
      params.push({
        board: board.slug,
      });
    });
  });
  return params;
}

export default async function BoardPage({ params }) {
  const { board } = await params;

  // 查找對應的分台
  let boardData = null;
  let categoryTitle = "";
  for (const category of navMain) {
    const foundBoard = category.items.find((item) => item.slug === board);
    if (foundBoard) {
      boardData = foundBoard;
      categoryTitle = category.title;
      break;
    }
  }

  if (!boardData) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{boardData.title}</h1>
        <p className="text-gray-600 mt-2">
          歡迎來到 {categoryTitle} - {boardData.title}！
        </p>
      </div>

      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">發布話題</h2>
        <PostForm board={board} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">話題列表</h2>
        <PostList board={board} />
      </div>
    </div>
  );
}