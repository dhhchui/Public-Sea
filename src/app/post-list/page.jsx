"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
        } else {
          console.error("Failed to fetch boards:", res.status);
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

        console.log("Fetching posts with URL:", url);
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          console.log("Posts fetched:", data.posts);
          setPosts(data.posts || []);
        } else {
          console.error("Failed to fetch posts:", res.status);
          setPosts([]);
        }
      } catch (error) {
        console.error("錯誤載入貼文:", error);
        setPosts([]);
      }
    };

    fetchPosts();
  }, [boardFilterId, categoryFilter]);

  const categories = {
    lifestyle: ["吹水台", "飲食台", "旅遊台"],
    tech: ["手機台", "電腦台"],
    news: ["時事台"],
    work: ["管理台", "上班台"],
    education: ["學術台", "校園台"],
    sports: ["體育台"],
    entertainment: ["遊戲台", "影視台", "音樂台"],
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
            <option value="work">工作</option>
            <option value="education">教育</option>
            <option value="sports">運動</option>
            <option value="entertainment">娛樂</option>
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
            {posts.map((post) => {
              const board = boards.find((b) => b.id === post.boardId);
              const boardSlug = board ? board.name : "時事台"; // 使用看板名稱作為 slug
              return (
                <div
                  key={post.id}
                  onClick={() => {
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
