"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileEditForm({
  formData,
  setFormData = () => {},
  handleInputChange,
  error,
  successMessage,
  setIsEditing,
}) {
  const [localError, setLocalError] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [localHobbies, setLocalHobbies] = useState(
    Array.isArray(formData.hobbies) ? formData.hobbies : []
  );
  const router = useRouter();

  const hobbyOptions = [
    "閱讀",
    "游泳",
    "遊戲",
    "烹飪",
    "遠足",
    "攝影",
    "旅行",
    "音樂",
    "跳舞",
    "繪畫",
    "寫作",
    "園藝",
    "騎行",
    "瑜伽",
    "電影",
  ];

  // 同步 formData.hobbies 到本地狀態
  useEffect(() => {
    console.log("formData.hobbies updated:", formData.hobbies);
    setLocalHobbies(Array.isArray(formData.hobbies) ? formData.hobbies : []);
  }, [formData.hobbies]);

  // 處理 checkbox 變化
  const handleHobbyChange = (hobby) => {
    const newHobbies = localHobbies.includes(hobby)
      ? localHobbies.filter((h) => h !== hobby)
      : [...localHobbies, hobby];

    console.log("Before update - Local Hobbies:", localHobbies);
    setLocalHobbies(newHobbies);
    console.log("After update - Local Hobbies:", newHobbies);
    try {
      setFormData((prev) => {
        const updatedFormData = { ...prev, hobbies: newHobbies };
        console.log("setFormData called - Updated formData:", updatedFormData);
        return updatedFormData;
      });
    } catch (err) {
      console.error("Error calling setFormData:", err);
      setLocalError("無法更新興趣，請稍後再試");
    }
  };

  // 驗證表單
  const validateForm = () => {
    if (/\s/.test(formData.nickname)) {
      setLocalError("暱稱不能包含空格或空白字符");
      return false;
    }

    if (formData.nickname.length < 3) {
      setLocalError("暱稱至少需要 3 個字符");
      return false;
    }

    if (formData.password) {
      if (/\s/.test(formData.password)) {
        setLocalError("密碼不能包含空格或空白字符");
        return false;
      }

      if (formData.password.length < 8) {
        setLocalError("密碼至少需要 8 個字符");
        return false;
      }
      if (formData.password.length > 24) {
        setLocalError("密碼不能超過 24 個字符");
        return false;
      }
      const hasLetter = /[a-zA-Z]/.test(formData.password);
      const hasNumber = /[0-9]/.test(formData.password);
      if (!hasLetter || !hasNumber) {
        setLocalError("密碼必須包含字母和數字");
        return false;
      }

      if (!oldPassword) {
        setLocalError("請輸入舊密碼");
        return false;
      }
    }

    setLocalError("");
    return true;
  };

  // 提交表單
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLocalError("請先登入");
        return;
      }

      const res = await fetch("/api/edit-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          hobbies: localHobbies, // 直接傳遞陣列
          oldPassword,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("後端響應不是 JSON 格式:", await res.text());
        setLocalError("伺服器響應格式錯誤，請稍後再試");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        if (data.logoutRequired) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          window.dispatchEvent(new Event("userLoggedOut"));
          setTimeout(() => {
            router.push("/login");
          }, 1000);
        } else {
          setIsEditing(false);
        }
      } else {
        setLocalError(data.message || "無法更新個人資料");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setLocalError("發生錯誤，請稍後再試");
    }
  };

  return (
    <Card className="mb-8 shadow-lg rounded-xl border border-gray-200">
      <CardHeader className="bg-white rounded-t-xl p-6">
        <CardTitle className="text-3xl font-bold text-gray-800">
          編輯個人資料
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6 bg-gray-50 rounded-b-xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="nickname"
              className="text-lg font-medium text-gray-700"
            >
              暱稱
            </Label>
            <Input
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              required
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="bio" className="text-lg font-medium text-gray-700">
              簡介
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label
              htmlFor="hobbies"
              className="text-lg font-medium text-gray-700"
            >
              興趣（選擇你喜歡的興趣）
            </Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {hobbyOptions.map((hobby) => (
                <label
                  key={hobby}
                  className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={localHobbies.includes(hobby)}
                    onChange={() => handleHobbyChange(hobby)}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-sm">{hobby}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label
              htmlFor="oldPassword"
              className="text-lg font-medium text-gray-700"
            >
              舊密碼（修改新密碼時必須填寫）
            </Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label
              htmlFor="password"
              className="text-lg font-medium text-gray-700"
            >
              新密碼（可選）
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
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
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(error || localError) && (
            <p className="text-red-500">{error || localError}</p>
          )}
          {successMessage && <p className="text-green-500">{successMessage}</p>}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md"
            >
              保存
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 py-2 px-4 rounded-md"
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
