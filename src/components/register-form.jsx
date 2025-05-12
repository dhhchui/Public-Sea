"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginForm } from "./login-form";

export function RegisterForm({ className, ...props }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "", // 新增 confirmPassword 字段
    nickname: "",
    gender: "undisclosed",
  });

  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name) => (value) => {
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    // 檢查必填字段
    if (!formData.username.trim()) {
      setMessage({ text: "請輸入用戶名", type: "error" });
      return false;
    }
    if (!formData.email.trim()) {
      setMessage({ text: "請輸入電子郵件", type: "error" });
      return false;
    }
    if (!formData.password) {
      setMessage({
        text: "請輸入密碼（8-24個字符，需包含大寫、小寫字母和一個特殊符號）",
        type: "error",
      });
      return false;
    }
    if (!formData.confirmPassword) {
      setMessage({
        text: "請再次輸入密碼以確認",
        type: "error",
      });
      return false;
    }

    // 檢查密碼格式（與後端一致）
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).+$/;
    if (!passwordStrengthRegex.test(formData.password)) {
      setMessage({
        text: "密碼格式不正確，需包含至少一個大寫字母、一個小寫字母和一個特殊符號。",
        type: "error",
      });
      return false;
    }

    // 檢查密碼長度（8-24 字符）
    if (formData.password.length < 8 || formData.password.length > 24) {
      setMessage({
        text: "密碼長度必須在 8 到 24 個字符之間。",
        type: "error",
      });
      return false;
    }

    // 檢查密碼是否包含空格
    if (/\s/.test(formData.password)) {
      setMessage({
        text: "密碼不能包含空格。",
        type: "error",
      });
      return false;
    }

    // 檢查密碼和確認密碼是否一致
    if (formData.password !== formData.confirmPassword) {
      setMessage({
        text: "兩次輸入的密碼不一致。",
        type: "error",
      });
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

  const [isLoginFormOpen, setIsLoginFormOpen] = useState(false);

  const switchToLoginForm = () => {
    setIsLoginFormOpen(!isLoginFormOpen);
  };

  if (!isLoginFormOpen) {
    return (
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-[1001]">
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Card>
            <CardHeader>
              <CardTitle>註冊帳號</CardTitle>
              <CardDescription>輸入你的電郵地址以註冊帳號</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">電郵地址</Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="username">用戶名稱</Label>
                    <Input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Username"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="nickname">綽號</Label>
                    <Input
                      type="text"
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="綽號"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="gender">性別</Label>
                    <Select
                      name="gender"
                      value={formData.gender}
                      onValueChange={handleSelectChange("gender")} // 使用 handleSelectChange
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇性別" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">男性</SelectItem>
                        <SelectItem value="female">女性</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                        <SelectItem value="undisclosed">不公開</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">密碼</Label>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="8-24個字符，需包含大寫、小寫字母和特殊符號"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="confirmPassword">再次輸入密碼</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="再次輸入密碼以確認"
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

                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full ${
                        isSubmitting ? "bg-gray-400 cursor-not-allowed" : ""
                      }`}
                    >
                      {isSubmitting ? "註冊中..." : "註冊"}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm">
                  已有帳號？{" "}
                  <a
                    onClick={switchToLoginForm}
                    className="underline underline-offset-4 cursor-pointer"
                  >
                    登入
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } else {
    return <LoginForm />;
  }
}
