"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PostForm({ board }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setMessage({ text: "請填寫標題和內容", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: "發佈中...", type: "info" });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/create-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: title,
          content,
          board,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: "發帖成功！", type: "success" });
        setTitle("");
        setContent("");
        router.refresh(); // 刷新帖子列表
      } else {
        setMessage({ text: data.message || "發帖失敗", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "網絡錯誤，請稍後再試", type: "error" });
      console.error("發帖錯誤:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          標題
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="輸入帖子標題"
          required
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-1">
          內容
        </label>
        <textarea
          id="content"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="輸入帖子內容"
          required
        />
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
        className={`px-4 py-2 rounded text-white ${
          isSubmitting
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {isSubmitting ? "發佈中..." : "發佈帖子"}
      </button>
    </form>
  );
}
