"use client";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RegisterForm } from "./register-form";
// import Link from "next/link";

export function LoginForm({
  className,
  ...props
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState({ text: "", type: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "登入中...", type: "info" });

    try {
      // 這裡應該替換為實際的登入API
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({
          text: "登入成功！即將跳轉...",
          type: "success",
        });
        // 登入成功後跳轉
        setTimeout(() => router.push("/"), 1500);
      } else {
        setMessage({
          text: "電子郵件或密碼錯誤",
          type: "error",
        });
      }
    } catch (error) {
      setMessage({
        text: "網絡錯誤，請稍後再試",
        type: "error",
      });
    }
  };

  // const handleCancel = () => {
  //   router.push("/");
  // };

  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState(false); // State to control form visibility

  const switchToRegisterForm = () => {
    setIsRegisterFormOpen(!isRegisterFormOpen);
  };

  if (!isRegisterFormOpen) {
    return (
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-[1001]">
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Card>
            <CardHeader>
              <CardTitle>登入帳號</CardTitle>
              <CardDescription>
                輸入你的電郵地址以登入帳號
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form>
                <div onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">電郵地址</Label>
                    <Input id="email" type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="m@example.com"
                      required />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">密碼</Label>
                      {/* <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                    Forgot your password?
                  </a> */}
                    </div>
                    <Input id="password" type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="至少6個字符"
                    />
                  </div>

                  {message.text && (
                    <div
                      className={`p-3 rounded ${message.type === "error"
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
                    <Button type="submit" className="w-full">
                      登入
                    </Button>
                    {/* <Button variant="outline" className="w-full">
                  Login with Google
                </Button> */}
                  </div>
                </div>
                <div className="mt-4 text-center text-sm">
                  沒有帳號？{" "}
                  <a onClick={switchToRegisterForm} className="underline underline-offset-4 cursor-pointer">
                    註冊
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } else {
    return (
      <RegisterForm />
    );
  }
}
