"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import UserList from "@/components/UserList";
import RatingModal from "@/components/RatingModal";

export default function UserProfile() {
  const router = useRouter();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    bio: "",
    hobbies: "",
    password: "",
    confirmPassword: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user-profile/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          setFormData({
            nickname: data.user.nickname || "",
            bio: data.user.bio || "",
            hobbies: data.user.hobbies ? data.user.hobbies.join(", ") : "",
            password: "",
            confirmPassword: "",
          });
          const currentUserId = JSON.parse(localStorage.getItem("user") || "{}")?.userId;
          if (currentUserId && data.user.followerIds?.includes(currentUserId)) {
            setIsFollowing(true);
          }
        } else {
          setError(data.message || "無法載入用戶資料");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("載入用戶資料時發生錯誤");
      }
    };

    fetchUser();
  }, [userId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const hobbiesArray = formData.hobbies
        ? formData.hobbies.split(",").map((hobby) => hobby.trim()).filter((hobby) => hobby)
        : [];

      const res = await fetch("/api/edit-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          hobbies: hobbiesArray,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("個人資料更新成功！");
        setUser((prev) => ({ ...prev, ...data.user }));
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        if (res.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError(data.message);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("更新個人資料時發生錯誤");
    }
  };

  const handleFollow = async () => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    try {
      const currentUserId = JSON.parse(localStorage.getItem("user") || "{}")?.userId;
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ followerId: currentUserId, followingId: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowing(true);
        setUser((prev) => ({
          ...prev,
          followerCount: prev.followerCount + 1,
          followerIds: [...prev.followerIds, currentUserId],
        }));
      } else {
        if (res.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError(data.message || "關注失敗");
      }
    } catch (error) {
      console.error("Error following user:", error);
      setError("關注時發生錯誤");
    }
  };

  const handleUnfollow = async () => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    try {
      const currentUserId = JSON.parse(localStorage.getItem("user") || "{}")?.userId;
      const res = await fetch("/api/unfollow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ followerId: currentUserId, followingId: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowing(false);
        setUser((prev) => ({
          ...prev,
          followerCount: prev.followerCount - 1,
          followerIds: prev.followerIds.filter((id) => id !== currentUserId),
        }));
      } else {
        if (res.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError(data.message || "取消關注失敗");
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
      setError("取消關注時發生錯誤");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>錯誤</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">
              {error}
              {error.includes("Invalid token") && (
                <span>
                  {" "}
                  請
                  <a href="/login" className="text-blue-500 underline">
                    重新登入
                  </a>
                  。
                </span>
              )}
            </p>
            <Button
              onClick={() => router.push("/")}
              className="w-full mt-4 bg-gray-500 hover:bg-gray-600"
            >
              返回首頁
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="mb-8 shadow-lg rounded-xl border border-gray-200">
          <CardHeader className="bg-white rounded-t-xl p-6">
            <CardTitle className="text-3xl font-bold text-gray-800">
              {user.nickname || user.username} 的個人資料
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6 bg-gray-50 rounded-b-xl">
            {user.isRedFlagged && (
              <p className="text-red-500 text-sm font-medium">
                注意：此用戶帳戶已被限制
              </p>
            )}
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nickname" className="text-lg font-medium text-gray-700">
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
                  <Label htmlFor="hobbies" className="text-lg font-medium text-gray-700">
                    興趣（用逗號分隔，例如：閱讀, 跑步, 烹飪）
                  </Label>
                  <Input
                    id="hobbies"
                    name="hobbies"
                    value={formData.hobbies}
                    onChange={handleInputChange}
                    placeholder="閱讀, 跑步, 烹飪"
                    className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-lg font-medium text-gray-700">
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
                  <Label htmlFor="confirmPassword" className="text-lg font-medium text-gray-700">
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
                {error && <p className="text-red-500">{error}</p>}
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
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-lg font-medium text-gray-700">暱稱: {user.nickname}</p>
                    <p className="text-gray-600">用戶名: {user.username}</p>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">簡介:</p>
                    <p className="text-gray-600">{user.bio || "未設置簡介"}</p>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">興趣:</p>
                    <p className="text-gray-600">
                      {user.hobbies && user.hobbies.length > 0 ? user.hobbies.join(", ") : "未設置興趣"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-lg font-medium ${user.rating < 0 ? "text-red-600" : "text-gray-700"}`}>
                      評分: {user.rating || 0}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Followers: {user.followerCount}
                      </p>
                      <Button
                        variant="link"
                        onClick={() => setShowFollowers(true)}
                        className="p-0 text-blue-500 hover:underline"
                      >
                        View Followers
                      </Button>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Following: {user.followedCount}
                      </p>
                      <Button
                        variant="link"
                        onClick={() => setShowFollowing(true)}
                        className="p-0 text-blue-500 hover:underline"
                      >
                        View Following
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  {parseInt(userId) !== JSON.parse(localStorage.getItem("user") || "{}")?.userId && (
                    <>
                      <Button
                        onClick={isFollowing ? handleUnfollow : handleFollow}
                        className={`${isFollowing ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white font-semibold py-2 px-4 rounded-md`}
                        disabled={user.isRedFlagged}
                      >
                        {isFollowing ? "Unfollow" : "Follow"}
                      </Button>
                      <RatingModal ratedUserId={parseInt(userId)} onRatingSubmitted={() => {
                        // 重新載入用戶資料以更新紅旗狀態
                        fetch(`/api/user-profile/${userId}`, {
                          method: "GET",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
                          },
                        })
                          .then((res) => res.json())
                          .then((data) => {
                            if (res.ok) {
                              setUser(data.user);
                            }
                          })
                          .catch((err) => console.error("Error refreshing user:", err));
                      }} />
                    </>
                  )}
                  {parseInt(userId) === JSON.parse(localStorage.getItem("user") || "{}")?.userId && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {showFollowers && (
          <UserList
            userIds={user.followerIds}
            title="Followers"
            onClose={() => setShowFollowers(false)}
          />
        )}

        {showFollowing && (
          <UserList
            userIds={user.followedIds}
            title="Following"
            onClose={() => setShowFollowing(false)}
          />
        )}

        <Button
          onClick={() => router.push("/")}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
        >
          返回首頁
        </Button>
      </div>
    </div>
  );
}