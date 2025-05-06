"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserList({ userIds, title, onClose }) {
  const [users, setUsers] = useState([]);
  const [followingStatus, setFollowingStatus] = useState({}); // 儲存每個用戶的 Follow 狀態
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/users-by-ids", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userIds }),
        });

        const data = await res.json();
        if (res.ok) {
          setUsers(data.users);
          // 獲取當前用戶的 followedIds，初始化 Follow 狀態
          const currentUserRes = await fetch("/api/current-user", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (currentUserRes.ok) {
            const currentUserData = await currentUserRes.json();
            const followedIds = currentUserData.user.followedIds || [];
            const statusMap = {};
            data.users.forEach((user) => {
              statusMap[user.id] = followedIds.includes(user.id);
            });
            setFollowingStatus(statusMap);
          }
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [userIds, router]);

  const handleFollow = async (targetUserId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json();
      if (res.ok) {
        setFollowingStatus((prev) => ({
          ...prev,
          [targetUserId]: true,
        }));
      } else {
        console.error("Error following user:", data.message);
      }
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex justify-between items-center p-2 border-b"
              >
                <span
                  onClick={() => router.push(`/user-profile/${user.id}`)}
                  className="cursor-pointer text-blue-500 hover:underline"
                >
                  {user.nickname}
                </span>
                {followingStatus[user.id] ? (
                  <span className="text-gray-500">Following</span>
                ) : (
                  <button
                    onClick={() => handleFollow(user.id)}
                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Follow
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={onClose}
          className="w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
