"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [boardFilterId, setBoardFilterId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [boards, setBoards] = useState([]);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await fetch("/api/boards", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setBoards(data.boards);
        }
      } catch (error) {
        console.error("錯誤載入看板:", error);
      }
    };

    fetchBoards();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        let url = "/api/post-list";
        const params = new URLSearchParams();

        if (boardFilterId === "popular") {
          params.append("popular", "true");
        } else if (boardFilterId) {
          params.append("boardId", boardFilterId);
        } else if (categoryFilter !== "all") {
          params.append("category", categoryFilter);
        }

        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());

        url += `?${params.toString()}`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts);
        }
      } catch (error) {
        console.error("錯誤載入貼文:", error);
      }
    };

    fetchPosts();
  }, [boardFilterId, categoryFilter, page, pageSize]);

  const categories = {
    lifestyle: ["吹水台", "美食天地", "旅遊分享"],
    tech: ["科技討論"],
    news: ["current-affairs"],
  };

  const filteredBoards =
    categoryFilter === "all"
      ? boards
      : boards.filter((board) =>
          categories[categoryFilter].includes(board.name)
        );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-2xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">貼文列表</h2>

        <div className="mb-4">
          <label className="mr-2">按分類篩選：</label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setBoardFilterId("");
              setPage(1);
            }}
            className="p-2 border rounded mr-2"
          >
            <option value="all">所有分類</option>
            <option value="lifestyle">生活</option>
            <option value="tech">科技</option>
            <option value="news">新聞</option>
          </select>

          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={() => {
                setBoardFilterId("");
                setPage(1);
              }}
              className={`p-2 rounded ${
                boardFilterId === "" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              所有看板
            </button>
            {filteredBoards.map((board) => (
              <button
                key={board.id}
                onClick={() => {
                  setBoardFilterId(board.id.toString());
                  setPage(1);
                }}
                className={`p-2 rounded ${
                  boardFilterId === board.id.toString()
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                {board.name}
              </button>
            ))}
            <button
              onClick={() => {
                setBoardFilterId("popular");
                setPage(1);
              }}
              className={`p-2 rounded ${
                boardFilterId === "popular"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              熱門看板
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="text-center">未找到貼文。</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() =>
                  router.push(
                    `/boards/${
                      boards.find((b) => b.id === post.boardId)?.slug ||
                      "current-affairs"
                    }/posts/${post.id}`
                  )
                }
                className="p-4 bg-white border rounded shadow-md cursor-pointer hover:bg-gray-50"
              >
                <h3 className="text-xl font-bold">{post.title}</h3>
                <p className="text-gray-700">{post.content}</p>
                <p className="text-gray-500 text-sm">
                  由 {post.author.username} 於{" "}
                  {new Date(post.createdAt).toLocaleString()} 發佈
                </p>
                <p className="text-gray-500 text-sm">
                  按讚數: {post.likeCount} | 瀏覽次數: {post.view}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}