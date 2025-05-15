'use client';

import { useState, useEffect } from 'react';
import { Backdrop } from '@/components/backdrop';
import { RegisterForm } from '@/components/register-form';
import { LoginForm } from '@/components/login-form';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  ChevronsUpDown,
  Handshake,
  LogIn,
  LogOut,
  UserRoundPlus,
  UserCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowPanel } from '@/components/FollowPanel';
import { FriendPanel } from '@/components/FriendPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationTriggerButton from '@/components/NotificationTriggerButton'; // 新增導入

export function NavUser() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isRegisterOverlayOpen, setIsRegisterOverlayOpen] = useState(false);
  const [isLoginOverlayOpen, setIsLoginOverlayOpen] = useState(false);
  const [isFollowPanelOpen, setIsFollowPanelOpen] = useState(false);
  const [isFriendPanelOpen, setIsFriendPanelOpen] = useState(false);

  useEffect(() => {
    const handleUserLoggedIn = (event) => {
      const userData = event.detail;
      if (userData) {
        if (typeof userData.userId === 'string') {
          userData.userId = parseInt(userData.userId);
        }
        setUser(userData);
        setIsLoggedIn(true);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
      }
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn);

    const storedUser = localStorage.getItem('user');
    const storedLoginStatus = localStorage.getItem('isLoggedIn');
    if (storedLoginStatus === 'true' && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (typeof parsedUser.userId === 'string') {
        parsedUser.userId = parseInt(parsedUser.userId);
        localStorage.setItem('user', JSON.stringify(parsedUser));
      }
      setIsLoggedIn(true);
      setUser(parsedUser);
    }

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, []);

  const toggleRegisterOverlay = () => {
    setIsRegisterOverlayOpen(!isRegisterOverlayOpen);
  };

  const toggleLoginOverlay = () => {
    setIsLoginOverlayOpen(!isLoginOverlayOpen);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          console.error('Logout failed:', data.message);
        } else {
          console.log('Logout successful:', data.message);
        }
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }

    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    setUser(null);
    setIsLoggedIn(false);
    window.dispatchEvent(new Event('userLoggedOut'));
    router.push('/');

    console.log('After logout - token:', localStorage.getItem('token'));
    console.log(
      'After logout - isLoggedIn:',
      localStorage.getItem('isLoggedIn')
    );
  };

  const handleProfileClick = async () => {
    if (!user?.userId || isNaN(user.userId)) {
      console.error('User ID is invalid or missing:', user);
      return;
    }
    try {
      const res = await fetch(`/api/user-profile/${user.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (res.ok) {
        router.push(`/user-profile/${user.userId}`);
      } else {
        const data = await res.json();
        console.error('API error response:', data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleFollowPanel = () => {
    setIsFollowPanelOpen(true);
  };

  const handleFriendPanel = () => {
    setIsFriendPanelOpen(true);
  };

  if (!isLoggedIn) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  <div className='grid flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-medium'>訪客</span>
                    <span className='truncate text-xs'>尚未登入</span>
                  </div>
                  <ChevronsUpDown className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
                side={isMobile ? 'bottom' : 'right'}
                align='end'
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={toggleRegisterOverlay}>
                    <UserRoundPlus className='mr-2 h-4 w-4' />
                    <span>註冊</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleLoginOverlay}>
                  <LogIn className='mr-2 h-4 w-4' />
                  <span>登入</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        {isRegisterOverlayOpen && (
          <>
            <Backdrop onClick={toggleRegisterOverlay} />
            <RegisterForm />
          </>
        )}

        {isLoginOverlayOpen && (
          <>
            <Backdrop onClick={toggleLoginOverlay} />
            <LoginForm />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          {/* 移除原有的 NotificationPanel 實例，改用 NotificationTriggerButton */}
          <NotificationTriggerButton />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <ThemeToggle />
        </SidebarMenuItem>

        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={user?.avatar} alt={user?.username} />
                  <AvatarFallback className='rounded-lg'>
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>
                    {user?.nickname || user?.username}
                  </span>
                  <span className='truncate text-xs'>{user?.email}</span>
                </div>
                <ChevronsUpDown className='ml-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarImage src={user?.avatar} alt={user?.username} />
                    <AvatarFallback className='rounded-lg'>
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-medium'>
                      {user?.nickname || user?.username}
                    </span>
                    <span className='truncate text-xs'>{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleProfileClick}>
                  <BadgeCheck className='mr-2 h-4 w-4' />
                  <span>帳號</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFollowPanel}>
                  <UserCheck className='mr-2 h-4 w-4' />
                  <span>關注</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFriendPanel}>
                  <Handshake className='mr-2 h-4 w-4' />
                  <span>好友</span>
                </DropdownMenuItem>
                {/* 移除原有的通知中心選項，改用 NotificationTriggerButton */}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className='mr-2 h-4 w-4' />
                <span>登出</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <FollowPanel
        user={user}
        isOpen={isFollowPanelOpen}
        onClose={() => setIsFollowPanelOpen(false)}
      />
      <FriendPanel
        user={user}
        isOpen={isFriendPanelOpen}
        onClose={() => setIsFriendPanelOpen(false)}
      />
    </>
  );
}
