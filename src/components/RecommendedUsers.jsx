"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// 自訂 fetcher 函數給 useSWR 使用
const fetcher = async (url) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) {
    throw new Error("請先登入");
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      response.status === 401
        ? "請先登入"
        : `伺服器錯誤: ${response.status} - ${text}`
    );
  }

  const data = await response.json();
  return data.users || [];
};

export default function RecommendedUsers() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followStatus, setFollowStatus] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [users, setUsers] = useState([]); // 控制用戶列表

  const {
    data: usersData = [],
    error: fetchError,
    mutate,
  } = useSWR(
    typeof window !== "undefined" ? "/api/recommend-users" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      fallbackData: [],
      revalidateOnMount: true,
    }
  );

  // 穩定 usersData 引用，避免頻繁改變
  const stableUsersData = useMemo(() => usersData, [JSON.stringify(usersData)]);

  // 初始化 users 狀態
  useEffect(() => {
    setUsers(stableUsersData);
  }, [stableUsersData]);

  // 初始化 followStatus
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      const initialStatus = {};
      users.forEach((user) => {
        if (user.id) {
          initialStatus[user.id] = false;
        }
      });
      setFollowStatus((prev) => {
        // 避免不必要的更新
        if (JSON.stringify(prev) === JSON.stringify(initialStatus)) {
          return prev;
        }
        return initialStatus;
      });
    }
  }, [fetchError, users]); // 僅依賴 fetchError 和 users

  const handleFollow = async (userId) => {
    setFollowLoading((prev) => ({ ...prev, [userId]: true }));
    setError(null);

    try {
      const response = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "關注失敗");
      }

      // 更新 followStatus
      setFollowStatus((prev) => ({ ...prev, [userId]: true }));

      // 移除已關注的用戶
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));

      // 可選：重新獲取數據以同步 followedIds
      mutate();
    } catch (err) {
      setError(err.message);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">載入中...</div>;
  }

  if (error) {
    return <div className="text-red-500">載入推薦用戶失敗：{error}</div>;
  }

  // 計算顯示的卡片：用戶卡片 + 補足的「沒有更多用戶」卡片
  const totalCards = 5;
  const userCount = users.length;
  const emptyCardCount = userCount < totalCards ? totalCards - userCount : 0;
  const displayUsers = [
    ...users,
    ...Array(emptyCardCount).fill({ id: null, message: "沒有更多用戶" }),
  ];

  const settings = {
    dots: true,
    infinite: displayUsers.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        推薦關注的用戶
      </h2>
      <Slider {...settings} className="w-full">
        {displayUsers.map((user, index) => (
          <div key={user.id ? user.id : `empty-${index}`} className="px-2">
            <div className="bg-white border rounded-lg shadow-md p-4 h-64 flex flex-col justify-between">
              {user.message ? (
                <div className="text-center text-gray-500 flex flex-col justify-center h-full">
                  <p className="text-lg font-semibold">{user.message}</p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {user.nickname}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      @{user.username}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      興趣:{" "}
                      {user.hobbies.length > 0 ? user.hobbies.join(", ") : "無"}
                    </p>
                  </div>
                  <button
                    className={`px-4 py-2 rounded transition self-center ${
                      followStatus[user.id]
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    onClick={() => {
                      if (!followStatus[user.id]) {
                        handleFollow(user.id);
                      }
                    }}
                    disabled={followStatus[user.id] || followLoading[user.id]}
                  >
                    {followLoading[user.id]
                      ? "正在關注..."
                      : followStatus[user.id]
                      ? "已關注"
                      : "關注"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
