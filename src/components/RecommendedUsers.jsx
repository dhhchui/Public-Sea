"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// 自訂 fetcher 函數給 useSWR 使用
const fetcher = async (url) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
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

  const { data: users, error: fetchError } = useSWR(
    "/api/recommend-users",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
    } else if (users) {
      setIsLoading(false);
    }
  }, [fetchError, users]);

  if (isLoading) {
    return <div className="text-gray-500">載入中...</div>;
  }

  if (error) {
    return <div className="text-red-500">載入推薦用戶失敗：{error}</div>;
  }

  if (users.length === 0) {
    return <p className="text-gray-500">目前沒有推薦用戶。</p>;
  }

  // 輪播設置
  const settings = {
    dots: true,
    infinite: users.length > 1,
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
        {users.map((user) => (
          <div key={user.id} className="px-2">
            <div className="bg-white border rounded-lg shadow-md p-4 h-64 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {user.nickname}
                </h3>
                <p className="text-sm text-gray-500 mt-1">@{user.username}</p>
                <p className="text-sm text-gray-500 mt-2">
                  興趣:{" "}
                  {user.hobbies.length > 0 ? user.hobbies.join(", ") : "無"}
                </p>
              </div>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition self-center"
                onClick={() => {
                  console.log(`Following user: ${user.id}`);
                }}
              >
                關注
              </button>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
