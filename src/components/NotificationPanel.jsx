"use client";

import { useState, useEffect } from "react";
import { Circle, Flag, X } from "lucide-react";
import { Backdrop } from "@/components/backdrop";
import { useRouter } from "next/navigation";
import { FriendPanel } from "@/components/FriendPanel";

export function NotificationPanel({
  user,
  isOpen,
  onClose,
  onNotificationRead,
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFriendPanelOpen, setIsFriendPanelOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.token) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/notifications", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "無法載入通知");
        }

        const data = await response.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [isOpen, user]);

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        if (onNotificationRead) {
          onNotificationRead();
        }
      } else {
        const data = await response.json();
        console.error("Failed to mark notification as read:", data.message);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getNotificationMessage = (notification) => {
    const senderName = notification.sender?.nickname || "匿名用戶";
    switch (notification.type) {
      case "FRIEND_REQUEST":
        return "你有一個新好友請求";
      case "friend_accept":
        return "你的好友請求已被接受";
      case "friend_reject":
        return "你的好友請求已被拒絕";
      case "friend_remove":
        return `${senderName} 已解除與你的好友關係`;
      case "POST":
        return `${senderName} 發布了一篇新貼文`;
      case "LIKE":
        return `${senderName} 點讚了你的貼文`;
      case "comment":
        return `${senderName} 評論了你的貼文`; // 添加 comment 類型描述
      case "FOLLOW":
        return `${senderName} 關注了你`;
      default:
        return "發送了一條通知";
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    switch (notification.type) {
      case "FRIEND_REQUEST":
        setIsFriendPanelOpen(true);
        break;
      case "POST":
      case "LIKE":
      case "comment": // 添加 comment 類型跳轉
        if (notification.postId) {
          router.push(`/view-post/${notification.postId}`);
          onClose();
        }
        break;
      case "friend_accept":
      case "friend_reject":
      case "friend_remove":
      case "FOLLOW":
        if (notification.senderId) {
          router.push(`/user-profile/${notification.senderId}`);
          onClose();
        }
        break;
      default:
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">通知中心</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          {isLoading && <p className="text-gray-500">載入中...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && notifications.length === 0 && (
            <p className="text-gray-500">暫無通知</p>
          )}
          {!isLoading && !error && notifications.length > 0 && (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border rounded p-3 hover:bg-gray-50 cursor-pointer flex items-center"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-1">
                    <p className="text-sm flex items-center">
                      <span
                        className={`font-medium ${
                          notification.sender?.isRedFlagged
                            ? "text-red-500"
                            : ""
                        }`}
                      >
                        {notification.sender?.nickname || "匿名用戶"}
                      </span>
                      {notification.sender?.isRedFlagged && (
                        <Flag className="ml-1 h-4 w-4 text-red-500" />
                      )}
                      <span className="ml-1">
                        {getNotificationMessage(notification)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Circle className="h-3 w-3 text-red-500 fill-red-500 ml-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <FriendPanel
        user={user}
        isOpen={isFriendPanelOpen}
        onClose={() => {
          setIsFriendPanelOpen(false);
          onClose();
        }}
      />
    </>
  );
}
