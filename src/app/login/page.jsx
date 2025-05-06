"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.usernameOrEmail.trim()) {
      setMessage({ text: "請輸入用戶名或電子郵件", type: "error" });
      return false;
    }
    if (!formData.password) {
      setMessage({ text: "請輸入密碼", type: "error" });
      return false;
    }
    if (formData.password.length < 6) {
      setMessage({ text: "密碼至少需要6個字符", type: "error" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage({ text: "登入中...", type: "info" });

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // 將 user 存入 localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        console.log("Stored user in localStorage:", data.user);
        setMessage({
          text: "登入成功！即將跳轉至首頁...",
          type: "success",
        });
        setTimeout(() => router.push("/boards/current-affairs"), 2000);
      } else {
        setMessage({
          text: data.message || "登入失敗，請檢查您的輸入",
          type: "error",
        });
      }
    } catch (error) {
      setMessage({
        text: "網絡錯誤，請稍後再試",
        type: "error",
      });
      console.error("登入錯誤:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold text-center mb-6">登入帳號</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            用戶名或電子郵件*
          </label>
          <input
            type="text"
            name="usernameOrEmail"
            value={formData.usernameOrEmail}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="用戶名或電子郵件"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">密碼*</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="至少6個字符"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-2 rounded transition-colors ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isSubmitting ? "登入中..." : "登入"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white transition-colors"
          >
            取消
          </button>
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

        <div className="text-center text-sm mt-4">
          還沒有帳號？{" "}
          <Link
            href="/register"
            className="text-blue-500 hover:underline font-medium"
          >
            立即註冊
          </Link>
        </div>
      </form>
    </div>
  );
}