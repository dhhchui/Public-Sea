import { notFound } from "next/navigation";
import { navMain } from "@/lib/boards";
import { PostForm } from "@/components/post-form";
import { PostList } from "@/components/post-list";
import PostPage from "./[postId]/page";

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

export default async function BoardPage({ params, searchParams }) {
  const { board } = await params;
  const postId = searchParams.postId;

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
    <div className="container mx-auto py-2 px-2 max-w-full flex flex-row gap-2">
      <div className="w-1/2">
        <div className="mb-2">
          <h1 className="text-3xl font-bold">{boardData.title}</h1>
          <p className="text-gray-600 mt-1">
            歡迎來到 {categoryTitle} - {boardData.title}！
          </p>
        </div>

        <div className="mb-2 bg-white p-2 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">發布話題</h2>
          <PostForm board={board} />
        </div>

        <div className="bg-white p-2 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">話題列表</h2>
          <PostList board={board} />
        </div>
      </div>

      <div className="w-1/2">
        {postId ? (
          <PostPage params={{ board, postId }} searchParams={searchParams} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            請選擇一個話題查看詳情
          </div>
        )}
      </div>
    </div>
  );
}