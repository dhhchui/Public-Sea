import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RequestResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/reset-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
      } else {
        setError(data.message || "無法發送重設連結");
      }
    } catch (err) {
      console.error("Error requesting reset link:", err);
      setError("發生錯誤，請稍後再試");
    }
  };

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
              htmlFor="email"
              className="text-lg font-medium text-gray-700"
            >
              電子郵件地址
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            發送重設連結
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
