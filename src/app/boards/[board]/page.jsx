import { notFound } from "next/navigation";
import BoardContent from "@/components/BoardContent";

const categoryMap = {
  吹水台: "其他",
  管理台: "其他",
  學術台: "興趣",
  時事台: "新聞",
  財經台: "新聞",
  手機台: "科技",
  電腦台: "科技",
  飲食台: "生活",
  上班台: "生活",
  旅遊台: "生活",
  校園台: "生活",
  體育台: "興趣",
  遊戲台: "興趣",
  影視台: "興趣",
  音樂台: "興趣",
};

export async function generateStaticParams() {
  try {
    // 使用 Next.js fetch 快取，設置 revalidate 為 24 小時（86400秒）
    const res = await fetch("http://localhost:3000/api/boards", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 86400 }, // 快取 24 小時
    });

    if (!res.ok) {
      console.error("Failed to fetch boards for static params:", res.status);
      return [];
    }

    const data = await res.json();
    const boards = data.boards || [];

    return boards.map((board) => ({
      board: encodeURIComponent(board.name), // 編碼中文名稱
    }));
  } catch (error) {
    console.error("Error in generateStaticParams:", error);
    return [];
  }
}

export default async function BoardPage({ params, searchParams }) {
  // 使用 await 解構 params
  const { board } = await params;
  const decodedBoard = decodeURIComponent(board); // 解碼 URL 中的中文名稱

  try {
    // 使用 Next.js fetch 快取，設置 revalidate 為 24 小時（86400秒）
    const res = await fetch("http://localhost:3000/api/boards", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 86400 }, // 快取 24 小時
    });

    if (!res.ok) {
      console.error("Failed to fetch boards:", res.status);
      notFound();
    }

    const data = await res.json();
    const boards = data.boards || [];

    const boardData = boards.find((item) => item.name === decodedBoard);

    if (!boardData) {
      console.log(`Board not found: ${decodedBoard}`);
      notFound();
    }

    const categoryTitle = categoryMap[boardData.name] || "其他";

    return (
      <div className="flex flex-row gap-2 h-full">
        <div className="w-1/2 flex flex-col gap-2">
          <div>
            <h1 className="text-3xl font-bold">{boardData.name}</h1>
            <p className="text-gray-600 mt-1">
              歡迎來到 {categoryTitle} - {boardData.name}！
            </p>
          </div>
          <BoardContent board={decodedBoard} boardData={boardData} />
        </div>
        <div className="w-1/2 flex items-center justify-center text-gray-500">
          請選擇一個話題查看詳情
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in BoardPage:", error);
    notFound();
  }
}
