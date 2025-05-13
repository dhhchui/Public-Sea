"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstname: "",
    lastname: "",
    nickname: "",
    gender: "undisclosed",
  });

  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setMessage({ text: "請輸入用戶名", type: "error" });
      return false;
    }
    if (!formData.email.trim()) {
      setMessage({ text: "請輸入電子郵件", type: "error" });
      return false;
    }
    if (!formData.password) {
      setMessage({ text: "請輸入密碼", type: "error" });
      return false;
    }
    if (formData.password.length < 6) {
      setMessage({ text: "密碼需要8-24個字符", type: "error" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage({ text: "處理中...", type: "info" });

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: "註冊成功！即將跳轉至登入頁面...",
          type: "success",
        });
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setMessage({
          text: data.message || "註冊失敗，請檢查您的輸入",
          type: "error",
        });
      }
    } catch (error) {
      setMessage({
        text: "網絡錯誤，請稍後再試",
        type: "error",
      });
      console.error("Registration error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/login");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold text-center mb-6">註冊帳號</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">姓氏</label>
            <input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="王"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">名字</label>
            <input
              type="text"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="小明"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">用戶名*</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="username123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">暱稱</label>
          <input
            type="text"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="暱稱 (可選)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">電子郵件*</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="example@example.com"
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

        <div>
          <label className="block text-sm font-medium mb-1">性別</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="undisclosed">不公開</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">其他</option>
          </select>
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
            {isSubmitting ? "註冊中..." : "註冊"}
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
          已有帳號？{" "}
          <Link
            href="/login"
            className="text-blue-500 hover:underline font-medium"
          >
            立即登入
          </Link>
        </div>
      </form>
    </div>
  );
}
