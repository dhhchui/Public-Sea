'use client';

import { useState, useEffect } from 'react';
import { Circle, Flag, X } from 'lucide-react';
import { Backdrop } from '@/components/backdrop';
import { useRouter } from 'next/navigation';
import { FriendPanel } from '@/components/FriendPanel';

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
        const response = await fetch('/api/notifications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || '無法載入通知');
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
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        console.error('Failed to mark notification as read:', data.message);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch('/api/notifications/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } else {
        const data = await response.json();
        console.error('Failed to delete notification:', data.message);
        setError('刪除通知失敗：' + data.message);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      setError('刪除通知時發生錯誤：' + error.message);
    }
  };

  const getNotificationMessage = (notification) => {
    const senderName = notification.sender?.nickname || '匿名用戶';
    switch (notification.type) {
      case 'FRIEND_REQUEST':
        return '你有一個新好友請求';
      case 'friend_accept':
        return '你的好友請求已被接受';
      case 'friend_reject':
        return '你的好友請求已被拒絕';
      case 'friend_remove':
        return `${senderName} 已解除與你的好友關係`;
      case 'POST':
        return `${senderName} 發布了一篇新貼文`;
      case 'LIKE':
        return `${senderName} 點讚了你的貼文`;
      case 'comment':
        return `${notification.sender?.nickname} 評論了你的貼文`;
      case 'FOLLOW':
        return `${senderName} 關注了你`;
      case 'PRIVATE_MESSAGE':
        return `${senderName} 發送了一條私人訊息`;
      default:
        return '發送了一條通知';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'FRIEND_REQUEST':
        setIsFriendPanelOpen(true);
        break;
      case 'POST':
      case 'LIKE':
      case 'comment':
        if (notification.postId) {
          router.push(`/view-post/${notification.postId}`);
          onClose();
        }
        break;
      case 'friend_accept':
      case 'friend_reject':
      case 'friend_remove':
      case 'FOLLOW':
        if (notification.senderId) {
          router.push(`/user-profile/${notification.senderId}`);
          onClose();
        }
        break;
      case 'PRIVATE_MESSAGE':
        if (notification.conversationId) {
          console.log(
            'Navigating to conversation:',
            notification.conversationId
          );
          router.push(`/conversation/${notification.conversationId}`);
          onClose();
        } else {
          console.error(
            'Conversation ID is missing for PRIVATE_MESSAGE notification'
          );
          setError('無法跳轉到對話：缺少對話 ID');
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
      <div className='fixed inset-0 flex items-center justify-center z-50'>
        <div className='bg-white rounded-lg shadow-lg w-full max-w-md p-6'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-bold'>通知中心</h2>
            <button
              onClick={onClose}
              className='text-gray-500 hover:text-gray-700'
            >
              <X className='h-6 w-6' />
            </button>
          </div>
          {isLoading && <p className='text-gray-500'>載入中...</p>}
          {error && <p className='text-red-500'>{error}</p>}
          {!isLoading && !error && notifications.length === 0 && (
            <p className='text-gray-500'>暫無通知</p>
          )}
          {!isLoading && !error && notifications.length > 0 && (
            <div className='space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar'>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className='border rounded p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between w-full'
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm flex items-center'>
                      <span
                        className={`font-medium truncate max-w-[120px] ${
                          notification.sender?.isRedFlagged
                            ? 'text-red-500'
                            : ''
                        }`}
                      >
                        {notification.sender?.nickname || '匿名用戶'}
                      </span>
                      {notification.sender?.isRedFlagged && (
                        <Flag className='ml-1 h-4 w-4 text-red-500' />
                      )}
                      <span className='ml-1 truncate'>
                        {getNotificationMessage(notification)}
                      </span>
                    </p>
                    <p className='text-xs text-gray-500 mt-1 truncate'>
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Circle className='h-3 w-3 text-red-500 fill-red-500 ml-2 flex-shrink-0' />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className='ml-2 text-red-500 hover:text-red-700'
                  >
                    <X className='h-5 w-5' />
                  </button>
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
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </>
  );
}
