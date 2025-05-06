import { notFound } from "next/navigation";
import { navMain } from "@/lib/boards";
import BoardContent from "@/components/BoardContent";

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
  const resolvedParams = await params;
  const { board } = resolvedParams;

  let boardData = null;
  for (const category of navMain) {
    const foundBoard = category.items.find((item) => item.slug === board);
    if (foundBoard) {
      boardData = foundBoard;
      break;
    }
  }

  if (!boardData) {
    notFound();
  }

  return (
    <div className="flex flex-row gap-2 h-full">
      <div className="w-1/2 flex flex-col gap-2">
        <BoardContent board={board} />
      </div>
      <div className="w-1/2 flex items-center justify-center text-gray-500">
        請選擇一個話題查看詳情
      </div>
    </div>
  );
}