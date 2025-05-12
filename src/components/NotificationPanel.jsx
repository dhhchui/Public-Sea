"use client";

import { useState, useEffect } from "react";
import { Flag, X } from "lucide-react";
import { Backdrop } from "@/components/backdrop";

export function NotificationPanel({ user, isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  if (!isOpen) return null;

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">通知中心</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
                  className="border rounded p-3 hover:bg-gray-50"
                >
                  <p className="text-sm flex items-center">
                    <span
                      className={`font-medium ${
                        notification.sender?.isRedFlagged ? "text-red-500" : ""
                      }`}
                    >
                      {notification.sender?.nickname || "匿名用戶"}
                    </span>
                    {notification.sender?.isRedFlagged && (
                      <Flag className="ml-1 h-4 w-4 text-red-500" />
                    )}
                    <span className="ml-1">
                      {notification.message || "發送了一條通知"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}