"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [boards, setBoards] = useState([]);
  const [popularPosts, setPopularPosts] = useState([]);
  const [boardName, setBoardName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          if (data.boards.length > 0) {
            setBoardName(data.boards[0].name);
          }
        }
      } catch (error) {
        console.error("Error fetching boards:", error);
        setMessage({ text: "無法載入分台列表", type: "error" });
      }
    };

    const fetchPopularPosts = async () => {
      try {
        const res = await fetch("/api/popular-posts", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPopularPosts(data.posts.slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching popular posts:", error);
        setMessage({ text: "無法載入熱門貼文", type: "error" });
      }
    };

    fetchBoards();
    fetchPopularPosts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/create-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, board: boardName }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "貼文創建成功", type: "success" });
        setTimeout(() => {
          router.push(`/boards/${boardName}`);
        }, 1500);
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch (error) {
      console.error("Error creating post:", error);
      setMessage({ text: "創建貼文失敗", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 根據排名計算圖標大小和透明度
  const getIconStyleByRank = (rank) => {
    const sizes = [24, 22, 20, 18, 16]; // 排名 1 到 5 的圖標大小
    const opacities = [1, 0.75, 0.5, 0.35, 0.2]; // 透明度
    return {
      size: sizes[rank - 1] || 16,
      opacity: opacities[rank - 1] || 0.2,
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          歡迎來到公海社交討論區
        </h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-700">
              🔥 熱門貼文
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularPosts.length === 0 ? (
              <p className="text-gray-500">暫無熱門貼文</p>
            ) : (
              <div className="grid gap-4">
                {popularPosts.map((post, index) => {
                  const rank = index + 1;
                  const { size, opacity } = getIconStyleByRank(rank);
                  return (
                    <div
                      key={post.id}
                      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer flex items-start"
                      onClick={() =>
                        router.push(`/boards/${post.board.name}/posts/${post.id}`)
                      }
                    >
                      <Flame
                        className="mr-3 flex-shrink-0 hover:scale-110 transition-all duration-200"
                        style={{
                          color: `rgba(255, 82, 82, ${opacity})`, // 紅色漸變
                        }}
                        size={size}
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-blue-600 hover:underline">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 mt-1 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                          <span>
                            由 {post.author.nickname || "未知用戶"} 發佈
                          </span>
                          <span>👁️ {post.view}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-700">
              創建新貼文
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <div
                className={`p-3 mb-4 rounded ${
                  message.type === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {message.text}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="board"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  分台
                </label>
                <select
                  id="board"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  disabled={isSubmitting}
                >
                  {boards.map((board) => (
                    <option key={board.id} value={board.name}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  標題
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  內容
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  rows="5"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <Button
                type="submit"
                className={`w-full ${
                  isSubmitting
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                } transition`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "發佈中..." : "發佈貼文"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}