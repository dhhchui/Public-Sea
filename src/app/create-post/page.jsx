"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { allBoards } from "@/components/boards-data"; // 引入所有分台

export default function CreatePostPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    topic: "",
    content: "",
    board: allBoards[0] || "", // 預設為第一個分台
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // 從 localStorage 獲取當前用戶
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 檢查是否登入
    if (!currentUser) {
      setMessage({ text: "請先登入以發布話題", type: "error" });
      setTimeout(() => router.push("/login"), 1500);
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: "發帖中...", type: "info" });

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage({ text: "未提供權杖，請先登入", type: "error" });
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/create-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.topic,
          content: formData.content,
          board: formData.board,
          authorId: currentUser.id, // 使用當前用戶的 ID
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: "帖子創建成功！即將跳轉...",
          type: "success",
        });
        setTimeout(() => router.push(`/boards/${formData.board}`), 1500);
      } else {
        setMessage({
          text: data.message || "發帖失敗，請重試",
          type: "error",
        });
      }
    } catch (error) {
      setMessage({
        text: "網絡錯誤，請稍後再試",
        type: "error",
      });
      console.error("Create post error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold text-center mb-6">創建帖子</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">標題*</label>
          <input
            type="text"
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="輸入帖子標題"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">內容*</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="輸入帖子內容"
            rows="5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">分台*</label>
          <select
            name="board"
            value={formData.board}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {allBoards.map((board) => (
              <option key={board} value={board}>
                {board}
              </option>
            ))}
          </select>
        </div>

        {message.text && (
          <div
            className={`p-3 rounded ${
              message.type === "error"
                ? "bg-red-100 text-red-700"
                : message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 rounded transition-colors ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {isSubmitting ? "發帖中..." : "發帖"}
        </button>
      </form>
    </div>
  );
}