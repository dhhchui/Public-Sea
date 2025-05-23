"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { navMain } from "@/lib/boards";

const boardIdMap = {
  吹水台: 1,
  管理台: 2,
  學術台: 3,
  時事台: 4,
  財經台: 5,
  手機台: 6,
  電腦台: 7,
  飲食台: 8,
  上班台: 9,
  旅遊台: 10,
  校園台: 11,
  體育台: 12,
  遊戲台: 13,
  影視台: 14,
  音樂台: 15,
};

export function PostForm({ board }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  // 檢查登入狀態
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user.token && user.userId && user.username) {
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
          setMessage({ text: "登入資訊無效，請重新登入", type: "error" });
        }
      } catch (error) {
        setCurrentUser(null);
        setMessage({ text: "登入資訊格式錯誤，請重新登入", type: "error" });
      }
    } else {
      setCurrentUser(null);
      setMessage({ text: "尚未登入，請先登入", type: "info" });
    }

    // 監聽 userLoggedOut 事件
    const handleUserLoggedOut = () => {
      setCurrentUser(null);
      setMessage({ text: "已登出，請重新登入", type: "info" });
      router.push("/login");
    };

    window.addEventListener("userLoggedOut", handleUserLoggedOut);
    return () =>
      window.removeEventListener("userLoggedOut", handleUserLoggedOut);
  }, [router]);

  // 處理表單提交
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentUser.token) {
      setMessage({ text: "請先登入以發布話題", type: "error" });
      return;
    }

    if (!title.trim() || !content.trim()) {
      setMessage({ text: "請填寫標題和內容", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: "發佈中...", type: "info" });

    try {
      const boardId = boardIdMap[board];
      console.log("Board parameter:", board, "Mapped boardId:", boardId);
      if (!boardId) {
        console.error("Invalid board:", board);
        setMessage({ text: `無效的分區: ${board}`, type: "error" });
        setIsSubmitting(false);
        return;
      }

      const requestBody = { title, content, boardId };
      console.log("Sending request body to /api/create-post:", requestBody);

      const response = await fetch("/api/create-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(errorData.message || "發布失敗");
      }

      const data = await response.json();
      console.log("API success response:", data);
      setMessage({ text: "發布成功", type: "success" });
      setTitle("");
      setContent("");
      setTimeout(() => router.push(`/view-post/${data.post.id}`), 1500);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      if (error.message.includes("token") || error.message.includes("401")) {
        setMessage({ text: "登入已過期，請重新登入", type: "error" });
        localStorage.removeItem("user");
        localStorage.removeItem("token"); // 確保清除 token
        setCurrentUser(null);
      } else {
        setMessage({ text: `發布失敗: ${error.message}`, type: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const boardData = navMain
    .flatMap((category) => category.items)
    .find((item) => item.slug === board);
  const boardTitle = boardData ? boardData.title : board;

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await fetch("/api/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          console.error("Logout failed:", data.message);
        } else {
          console.log("Logout successful:", data.message);
        }
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setCurrentUser(null);
    setMessage({ text: "已登出，請重新登入", type: "info" });
    window.dispatchEvent(new Event("userLoggedOut"));
    router.push("/login");

    console.log("After logout - token:", localStorage.getItem("token"));
  };

  return (
    <div className="space-y-4">
      {currentUser && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">歡迎，{currentUser.username}</p>
          <button
            onClick={handleLogout}
            className="text-sm text-blue-600 hover:underline"
          >
            登出
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="輸入話題標題"
            required
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
            {message.type === "error" && !currentUser && (
              <a href="/login" className="ml-2 text-blue-600 hover:underline">
                前往登入
              </a>
            )}
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
    </div>
  );
}
