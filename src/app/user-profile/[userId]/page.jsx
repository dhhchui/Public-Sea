"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ProfileDisplay from "@/components/ProfileDisplay";
import UserList from "@/components/UserList";
import ProfileEditForm from "@/components/ProfileEditForm";

const PREDEFINED_HOBBIES = [
  "閱讀",
  "跑步",
  "烹飪",
  "音樂",
  "旅行",
  "攝影",
  "遊戲",
  "健身",
  "畫畫",
  "電影",
];

export default function UserProfile() {
  const router = useRouter();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    bio: "",
    hobbies: [],
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
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch(`/api/user-profile/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setUser({
            ...data.user,
            followerIds: data.user.followerIds || [],
            followedIds: data.user.followedIds || [],
          });
          setFormData({
            nickname: data.user.nickname || "",
            bio: data.user.bio || "",
            hobbies: data.user.hobbies || [],
            password: "",
            confirmPassword: "",
          });

          const userData = JSON.parse(localStorage.getItem("user") || "{}");
          const currentUserId = userData?.userId
            ? parseInt(userData.userId)
            : null;
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
  }, [userId, router]);

  const validatePassword = (password) => {
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).+$/;
    if (!passwordStrengthRegex.test(password)) {
      return '密碼必須至少包含一個大寫字母、一個小寫字母和一個特殊符號。';
    }
    if (password.length < 8 || password.length > 24) {
      return '密碼長度必須在 8 到 24 個字符之間。';
    }
    if (/\s/.test(password)) {
      return '密碼不能包含空格。';
    }
    return '';
  };

  const validatePasswordsMatch = (password, confirmPassword) => {
    if (password !== confirmPassword) {
      return '兩次輸入的密碼並不相同';
    }
    return '';
  };

  const validateNickname = (nickname) => {
    if (!nickname.trim()) {
      return '暱稱不能為空或僅包含空格。';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHobbyChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const newHobbies = checked
        ? [...prev.hobbies, value]
        : prev.hobbies.filter((hobby) => hobby !== value);
      return { ...prev, hobbies: newHobbies };
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const nicknameError = validateNickname(formData.nickname);
    if (nicknameError) {
      setError(nicknameError);
      return;
    }

    if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      const passwordsMatchError = validatePasswordsMatch(
        formData.password,
        formData.confirmPassword
      );
      if (passwordsMatchError) {
        setError(passwordsMatchError);
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
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
          nickname: formData.nickname.trim(),
          hobbies: formData.hobbies,
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
    const token = localStorage.getItem("token");
    if (!token) {
      setError("未登入，請先登入");
      router.push("/login");
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserId = userData?.userId ? parseInt(userData.userId) : null;
      const targetUserIdInt = parseInt(userId);

      if (!currentUserId || isNaN(targetUserIdInt)) {
        setError("無法獲取用戶資訊，請重新登入");
        return;
      }

      const res = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetUserIdInt }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsFollowing(true);
        setUser((prev) => ({
          ...prev,
          followerCount: (prev.followerCount || 0) + 1,
          followerIds: [...(prev.followerIds || []), currentUserId],
        }));
        setSuccessMessage("關注成功！");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        if (res.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setError("登入過期，請重新登入");
          router.push("/login");
          return;
        }
        setError(data.message || "關注失敗");
        setIsFollowing(false);
      }
    } catch (error) {
      console.error("Error following user:", error);
      setError("關注時發生錯誤：" + error.message);
      setIsFollowing(false);
    }
  };

  const handleUnfollow = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("未登入，請先登入");
      router.push("/login");
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserId = userData?.userId ? parseInt(userData.userId) : null;
      const targetUserIdInt = parseInt(userId);

      if (!currentUserId || isNaN(targetUserIdInt)) {
        setError("無法獲取用戶資訊，請重新登入");
        return;
      }

      const res = await fetch("/api/unfollow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetUserIdInt }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsFollowing(false);
        setUser((prev) => ({
          ...prev,
          followerCount: (prev.followerCount || 0) - 1,
          followerIds: (prev.followerIds || []).filter((id) => id !== currentUserId),
        }));
        setSuccessMessage("取消關注成功！");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        if (res.status === 401) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setError("登入過期，請重新登入");
          router.push("/login");
          return;
        }
        setError(data.message || "取消關注失敗");
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
      setError("取消關注時發生錯誤：" + error.message);
      setIsFollowing(true);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-full max-w-md p-6">
          <p className="text-red-500 text-center">
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
          <button
            onClick={() => router.push("/")}
            className="w-full mt-4 p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            返回首頁
          </button>
        </div>
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
        {isEditing ? (
          <ProfileEditForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleHobbyChange={handleHobbyChange}
            handleEditSubmit={handleEditSubmit}
            error={error}
            successMessage={successMessage}
            setIsEditing={setIsEditing}
          />
        ) : (
          <ProfileDisplay
            user={user}
            userId={userId}
            isFollowing={isFollowing}
            handleFollow={handleFollow}
            handleUnfollow={handleUnfollow}
            setIsEditing={setIsEditing}
            showFollowers={showFollowers}
            setShowFollowers={setShowFollowers}
            showFollowing={showFollowing}
            setShowFollowing={setShowFollowing}
            router={router}
          />
        )}

        {showFollowers && (
          <UserList
            userIds={user.followerIds || []}
            title="Followers"
            onClose={() => setShowFollowers(false)}
          />
        )}

        {showFollowing && (
          <UserList
            userIds={user.followedIds || []}
            title="Following"
            onClose={() => setShowFollowing(false)}
          />
        )}

        {!isEditing && (
          <button
            onClick={() => router.push("/")}
            className="w-full max-w-md mx-auto block p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            返回首頁
          </button>
        )}
      </div>
    </div>
  );
}