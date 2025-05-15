"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [email, setEmail] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");
    if (!emailParam || !tokenParam) {
      setError("無效的重設連結");
      setIsLoading(false);
      return;
    }
    setEmail(decodeURIComponent(emailParam));
    setToken(tokenParam);
    setIsLoading(false);
  }, [searchParams]);

  const validatePasswordFormat = (pwd) => {
    if (pwd.includes(" ")) {
      return "密碼不能包含空格";
    }
    if (pwd.length < 8) {
      return "密碼必須至少 8 個字符";
    }
    if (pwd.length > 24) {
      return "密碼不能超過 24 個字符";
    }
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return "密碼必須至少包含一個大寫字母、一個小寫字母、一個數字和一個特別符號";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setError("密碼不匹配");
      return;
    }

    const passwordError = validatePasswordFormat(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      console.log("發送請求至 /api/reset-password/confirm");
      const res = await fetch("/api/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token, password }),
      });

      console.log("響應狀態:", res.status);
      const contentType = res.headers.get("content-type");
      console.log("響應 Content-Type:", contentType);

      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await res.text();
        console.error("後端響應不是 JSON 格式:", responseText);
        setError("伺服器響應格式錯誤，請稍後再試");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.message || "無法重設密碼");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      setError("發生錯誤，請稍後再試");
    }
  };

  if (isLoading) {
    return <div>載入中...</div>;
  }

  if (error && !email && !token) {
    return (
      <Card className="max-w-md mx-auto mt-8 shadow-lg rounded-xl border border-gray-200">
        <CardHeader className="bg-white rounded-t-xl p-6">
          <CardTitle className="text-2xl font-bold text-gray-800">
            錯誤
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-gray-50 rounded-b-xl">
          <p className="text-red-500">{error}</p>
          <Button
            onClick={() => router.push("/login")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md w-full"
          >
            返回登入頁面
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-8 shadow-lg rounded-xl border border-gray-200">
      <CardHeader className="bg-white rounded-t-xl p-6">
        <CardTitle className="text-2xl font-bold text-gray-800">
          重設密碼
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6 bg-gray-50 rounded-b-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="password"
              className="text-lg font-medium text-gray-700"
            >
              新密碼
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label
              htmlFor="confirmPassword"
              className="text-lg font-medium text-gray-700"
            >
              確認新密碼
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          {successMessage && <p className="text-green-500">{successMessage}</p>}
          <Button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md w-full"
          >
            重設密碼
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
