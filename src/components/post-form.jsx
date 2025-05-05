"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function PostForm({ board }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  // 從 localStorage 獲取當前用戶
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 檢查是否登入
    if (!currentUser) {
      setMessage({ text: "請先登入以發布話題", type: "error" });
      setTimeout(() => router.push("/login"), 1500);
      return;
    }

    if (!title.trim() || !content.trim()) {
      setMessage({ text: "請填寫標題和內容", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: "發佈中...", type: "info" });

    try {
      console.log("Submitting post:", { title, content, board, authorId: currentUser.id });

      const response = await fetch("/api/create-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          board,
          authorId: currentUser.id, // 使用當前用戶的 ID
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.log("Non-OK response:", response.status, text);
        try {
          const data = JSON.parse(text);
          setMessage({ text: data.message || "發帖失敗", type: "error" });
        } catch (error) {
          setMessage({ text: `伺服器錯誤: ${response.status}`, type: "error" });
        }
        return;
      }

      const data = await response.json();
      console.log("Post response:", data);

      setMessage({ text: "話題發布成功！", type: "success" });
      setTitle("");
      setContent("");
      router.refresh();
    } catch (error) {
      console.error("發帖錯誤:", error);
      setMessage({ text: "網絡錯誤，請稍後再試", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          標題
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="輸入話題標題"
          required
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          內容
        </label>
        <textarea
          id="content"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="輸入話題內容"
          required
        />
      </div>

      {message.text && (
        <div
          className={`p-3 rounded text-sm ${
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
        className={`w-full py-2 px-4 rounded text-white font-medium ${
          isSubmitting
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isSubmitting ? "發佈中..." : "發布話題"}
      </button>
    </form>
  );
}