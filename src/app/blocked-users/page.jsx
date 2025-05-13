"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BlockedUsers() {
  const [blockedList, setBlockedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/blocked-users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBlockedList(data.blockedList);
        setError(null);
      } else if (response.status === 401 || response.status === 403) {
        console.error(response.status === 401 ? "Token is missing." : "Token is invalid.");
        router.push("/login");
      } else {
        const errorData = await response.json();
        setError(errorData.message || "伺服器錯誤，請稍後重試");
      }
    } catch (error) {
      setError("網絡錯誤，請稍後重試");
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId) => {
    try {
      const response = await fetch("/api/unblock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ blockedUserId }),
      });

      if (response.ok) {
        // 成功取消封鎖，從 blockedList 中移除該用戶
        setBlockedList((prev) =>
          prev.filter((user) => user.id !== blockedUserId)
        );
      } else if (response.status === 401 || response.status === 403) {
        router.push("/login");
      } else {
        const errorData = await response.json();
        setError(errorData.message || "取消封鎖失敗，請稍後重試");
      }
    } catch (error) {
      setError("網絡錯誤，請稍後重試");
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">封鎖列表</h1>
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500">載入中...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : blockedList.length === 0 ? (
          <p className="text-gray-500">您尚未封鎖任何用戶</p>
        ) : (
          <ul className="list-none space-y-2">
            {blockedList.map((user) => (
              <li
                key={user.id}
                className="flex justify-between items-center p-2 border-b rounded hover:bg-gray-200"
              >
                <span
                  onClick={() => router.push(`/user-profile/${user.id}`)}
                  className="cursor-pointer text-blue-500 hover:underline"
                >
                  {user.nickname}
                </span>
                <button
                  onClick={() => handleUnblock(user.id)}
                  className="text-red-500 hover:underline"
                >
                  取消封鎖
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}