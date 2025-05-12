"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ProfileErrorAndLoading from "@/components/ProfileErrorAndLoading";
import ProfileEditForm from "@/components/ProfileEditForm";
import ProfileDisplay from "@/components/ProfileDisplay";
import UserList from "@/components/UserList";

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

  return (
    <ProfileErrorAndLoading error={error} user={user} router={router}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {isEditing ? (
          <ProfileEditForm
            formData={formData}
            handleInputChange={handleInputChange}
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
      </div>
    </ProfileErrorAndLoading>
  );
}