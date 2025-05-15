'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { NotificationPanel } from '@/components/NotificationPanel';

export default function NotificationTriggerButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      setUser({ ...parsedUser, token });
      fetchUnreadCount(token);
    } else {
      setUser(null);
    }

    const handleUserLoggedOut = () => {
      setUser(null);
      setUnreadCount(0);
      setIsOpen(false);
    };

    window.addEventListener('userLoggedOut', handleUserLoggedOut);
    return () =>
      window.removeEventListener('userLoggedOut', handleUserLoggedOut);
  }, []);

  const fetchUnreadCount = async (token) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '無法載入通知');
      }

      const data = await response.json();
      const unread = data.notifications.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  const refreshUnreadCount = () => {
    if (user?.token) {
      fetchUnreadCount(user.token);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* <NotificationPanel
        user={user}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          refreshUnreadCount();
        }}
        onNotificationRead={refreshUnreadCount} // 傳遞回調函數
      > */}
      <SidebarMenuButton
        className='relative cursor-pointer'
        onClick={() => setIsOpen(true)}
      >
        {/* <SidebarMenuButton> */}
        <Bell />
        通知
        {unreadCount > 0 && <Badge className='ml-auto'>{unreadCount}</Badge>}
      </SidebarMenuButton>
      <NotificationPanel
        user={user}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          refreshUnreadCount();
        }}
        onNotificationRead={refreshUnreadCount} // 傳遞回調函數
      />
      {/* </NotificationPanel> */}
    </>
  );
}
