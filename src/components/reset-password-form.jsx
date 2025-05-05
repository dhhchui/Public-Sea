"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordForm({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const userId = searchParams.get("id");

  useEffect(() => {
    if (token && userId) {
      setIsVerified(true);
    }
  }, [token, userId]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("請輸入您的電子郵件地址。");
      return;
    }

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          if (onClose) onClose();
          router.push("/login");
        }, 5000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("網絡錯誤，請稍後再試。");
    }
  };

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    if (!hasUpperCase || !hasLowerCase) {
      return "密碼必須至少包含一個大寫字母和一個小寫字母。";
    }
    return "";
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("所有欄位都是必填的。");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("密碼不匹配。");
      return;
    }

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          if (onClose) onClose();
          router.push("/login");
        }, 3000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("發生錯誤，請稍後再試。");
    }
  };

  return (
    <div className="w-full">
      {!isVerified ? (
        <>
          <h2 className="text-2xl font-bold mb-4 text-center">忘記密碼</h2>
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
          {success && <p className="text-green-500 mb-4 text-center">{success}</p>}
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">電子郵件地址</Label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <Button type="submit" className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              發送重設密碼郵件
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            記得密碼？{" "}
            <a
              onClick={onClose}
              className="underline underline-offset-4 cursor-pointer text-blue-600"
            >
              返回登入
            </a>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4 text-center">重設密碼</h2>
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
          {success && <p className="text-green-500 mb-4 text-center">{success}</p>}
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="password">新密碼</Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <Input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <Button type="submit" className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              重設密碼
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <a
              onClick={onClose}
              className="underline underline-offset-4 cursor-pointer text-blue-600"
            >
              返回登入
            </a>
          </div>
        </>
      )}
    </div>
  );
}