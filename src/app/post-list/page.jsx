"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 真實的 boardId 到 name 和 slug 的映射
const boardMap = [
  { id: 1, name: "吹水台", slug: "吹水台" },
  { id: 2, name: "管理台", slug: "管理台" },
  { id: 3, name: "學術台", slug: "學術台" },
  { id: 4, name: "時事台", slug: "時事台" },
  { id: 5, name: "財經台", slug: "財經台" },
  { id: 6, name: "手機台", slug: "手機台" },
  { id: 7, name: "電腦台", slug: "電腦台" },
  { id: 8, name: "飲食台", slug: "飲食台" },
  { id: 9, name: "上班台", slug: "上班台" },
  { id: 10, name: "旅遊台", slug: "旅遊台" },
  { id: 11, name: "校園台", slug: "校園台" },
  { id: 12, name: "體育台", slug: "體育台" },
  { id: 13, name: "遊戲台", slug: "遊戲台" },
  { id: 14, name: "影視台", slug: "影視台" },
  { id: 15, name: "音樂台", slug: "音樂台" },
];

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [boardFilterId, setBoardFilterId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [boards, setBoards] = useState([]);
  const router = useRouter();

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
        if (boardFilterId) {
          url += `?boardId=${boardFilterId}`;
        } else if (categoryFilter !== "all") {
          // 暫不支援 category 篩選，後端未實現
          return;
        }

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
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
  }, [boardFilterId, categoryFilter]);

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
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="text-center">未找到貼文。</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => {
                  const boardSlug = boardMap.find((b) => b.id === post.boardId)?.slug || "時事台";
                  router.push(`/boards/${boardSlug}/posts/${post.id}`);
                }}
                className="p-4 bg-white border rounded shadow-md cursor-pointer hover:bg-gray-50"
              >
                <h3 className="text-xl font-bold">{post.title}</h3>
                <p className="text-gray-700">{post.content}</p>
                <p className="text-gray-500 text-sm">
                  由 {post.author?.nickname || "未知"} 於{" "}
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