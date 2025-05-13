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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RegisterForm } from "./Register-form";
import ResetPasswordForm from "./Reset-password-form";

export function LoginForm({ className, ...props }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        const user = {
          userId: data.user.userId,
          username: data.user.username,
          email: data.user.email,
          nickname: data.user.nickname,
        };
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("token", data.user.token);
        console.log("Stored user in localStorage:", user);
        console.log("Stored token in localStorage:", data.user.token);
        setMessage({
          text: "登入成功！即將跳轉...",
          type: "success",
        });
        const userLoggedInEvent = new CustomEvent("userLoggedIn", {
          detail: user,
        });
        window.dispatchEvent(userLoggedInEvent);
        setTimeout(() => router.push("/"), 1500);
      } else {
        setMessage({
          text: data.message || "用戶名/電子郵件或密碼錯誤",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error during login:", error);
      setMessage({
        text: "網絡錯誤，請稍後再試",
        type: "error",
      });
    }
  };

  const switchToRegisterForm = () => {
    setIsRegisterFormOpen(!isRegisterFormOpen);
  };

  const openResetForm = () => {
    console.log("Opening reset password form");
    setIsResetOpen(true);
  };

  const closeResetForm = () => {
    console.log("Closing reset password form");
    setIsResetOpen(false);
  };

  if (isRegisterFormOpen) {
    return <RegisterForm />;
  }

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-[1001]">
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>登入帳號</CardTitle>
            <CardDescription>
              輸入你的電郵地址或用戶名稱以登入帳號
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="usernameOrEmail">電郵地址 或 用戶名稱</Label>
                  <Input
                    type="text"
                    name="usernameOrEmail"
                    value={formData.usernameOrEmail}
                    onChange={handleChange}
                    required
                  />
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
                  <button
                    type="button"
                    onClick={openResetForm}
                    className="text-red-600 text-sm font-medium text-left underline underline-offset-4 cursor-pointer"
                  >
                    忘記密碼
                  </button>
                  <Button type="submit" className="w-full">
                    登入
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      {isResetOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm z-[1002] flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              onClick={closeResetForm}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            <ResetPasswordForm onClose={closeResetForm} />
          </div>
        </div>
      )}
    </div>
  );
}
