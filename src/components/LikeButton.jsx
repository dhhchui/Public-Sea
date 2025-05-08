"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LikeButton({
  itemId,
  itemType,
  initialLikeCount,
  initialLiked,
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    setLiked(initialLiked);
    setLikeCount(initialLikeCount);
  }, [initialLiked, initialLikeCount]);

  const handleLike = async () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    const token = user?.token;
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId,
          itemType,
          action: liked ? "unlike" : "like",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setLiked(!liked);
        setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
        setError("");
      } else {
        setError(data.message || "按讚操作失敗");
      }
    } catch (error) {
      console.error("按讚錯誤:", error);
      setError("按讚時發生錯誤，請稍後再試");
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleLike}
        className={`p-1 rounded-full ${
          liked ? "text-red-500" : "text-gray-500"
        } hover:bg-gray-100`}
      >
        {liked ? "❤️" : "🤍"} {likeCount}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}