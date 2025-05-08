"use client";

import { useState, useEffect } from "react";
import { Backdrop } from "@/components/backdrop";
import { RegisterForm } from "@/components/register-form";
import { LoginForm } from "@/components/login-form";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  Handshake,
  LogIn,
  LogOut,
  Sparkles,
  UserRoundPlus,
  Users,
  UserCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowPanel } from "@/components/FollowPanel";
import { FriendPanel } from "@/components/FriendPanel";

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
        if (typeof userData.userId === "string") {
          userData.userId = parseInt(userData.userId);
        }
        setUser(userData);
        setIsLoggedIn(true);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("isLoggedIn", "true");
      }
    };

    window.addEventListener("userLoggedIn", handleUserLoggedIn);

    const storedUser = localStorage.getItem("user");
    const storedLoginStatus = localStorage.getItem("isLoggedIn");
    if (storedLoginStatus === "true" && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (typeof parsedUser.userId === "string") {
        parsedUser.userId = parseInt(parsedUser.userId);
        localStorage.setItem("user", JSON.stringify(parsedUser));
      }
      setIsLoggedIn(true);
      setUser(parsedUser);
    }

    return () => {
      window.removeEventListener("userLoggedIn", handleUserLoggedIn);
    };
  }, []);

  const toggleRegisterOverlay = () => {
    setIsRegisterOverlayOpen(!isRegisterOverlayOpen);
  };

  const toggleLoginOverlay = () => {
    setIsLoginOverlayOpen(!isLoginOverlayOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    setUser(null);
    setIsLoggedIn(false);
    router.push("/");
  };

  const handleProfileClick = async () => {
    if (!user?.userId || isNaN(user.userId)) {
      console.error("User ID is invalid or missing:", user);
      return;
    }
    try {
      const res = await fetch(`/api/user-profile/${user.userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (res.ok) {
        router.push(`/user-profile/${user.userId}`);
      } else {
        const data = await res.json();
        console.error("API error response:", data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">訪客</span>
                    <span className="truncate text-xs">尚未登入</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={toggleRegisterOverlay}>
                    <UserRoundPlus className="mr-2 h-4 w-4" />
                    <span>註冊</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleLoginOverlay}>
                  <LogIn className="mr-2 h-4 w-4" />
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.avatar} alt={user?.username} />
                  <AvatarFallback className="rounded-lg">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user?.nickname || user?.username}
                  </span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.avatar} alt={user?.username} />
                    <AvatarFallback className="rounded-lg">
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.nickname || user?.username}
                    </span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleProfileClick}>
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  <span>帳號</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFollowPanel}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  <span>關注</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFriendPanel}>
                  <Handshake className="mr-2 h-4 w-4" />
                  <span>好友</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>通知</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>登出</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <FollowPanel user={user} isOpen={isFollowPanelOpen} onClose={() => setIsFollowPanelOpen(false)} />
      <FriendPanel user={user} isOpen={isFriendPanelOpen} onClose={() => setIsFriendPanelOpen(false)} />
    </>
  );
}
// "use client";

// import { useRouter } from "next/navigation";
// import {
//   BadgeCheck,
//   Bell,
//   ChevronsUpDown,
//   CreditCard,
//   LogOut,
//   Sparkles,
// } from "lucide-react";
// import { useEffect, useState } from "react";

// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   useSidebar,
// } from "@/components/ui/sidebar";

// export function NavUser() {
//   const router = useRouter();
//   const { isMobile } = useSidebar();
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     // 從 localStorage 讀取登入狀態
//     const storedUser = localStorage.getItem("user");
//     const storedLoginStatus = localStorage.getItem("isLoggedIn");

//     if (storedLoginStatus === "true" && storedUser) {
//       setIsLoggedIn(true);
//       setUser(JSON.parse(storedUser));
//     }

//     // 監聽登入事件
//     const handleUserLoggedIn = () => {
//       const userData = JSON.parse(localStorage.getItem("user"));
//       setIsLoggedIn(true);
//       setUser(userData);
//     };

//     window.addEventListener("userLoggedIn", handleUserLoggedIn);

//     return () => {
//       window.removeEventListener("userLoggedIn", handleUserLoggedIn);
//     };
//   }, []);

//   const handleRegisterClick = () => {
//     router.push("/register");
//   };

//   const handleLoginClick = () => {
//     router.push("/login");
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("user");
//     localStorage.removeItem("isLoggedIn");
//     setUser(null);
//     setIsLoggedIn(false);
//     router.push("/");
//   };

//   if (!isLoggedIn) {
//     return (
//       <div className="flex gap-4 p-4">
//         <button
//           onClick={handleRegisterClick}
//           className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
//         >
//           註冊
//         </button>
//         <button
//           onClick={handleLoginClick}
//           className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
//         >
//           登入
//         </button>
//       </div>
//     );
//   }

//   return (
//     <SidebarMenu>
//       <SidebarMenuItem>
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <SidebarMenuButton
//               size="lg"
//               className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
//             >
//               <Avatar className="h-8 w-8 rounded-lg">
//                 <AvatarImage src={user?.avatar} alt={user?.username} />
//                 <AvatarFallback className="rounded-lg">
//                   {user?.username?.charAt(0).toUpperCase() || "U"}
//                 </AvatarFallback>
//               </Avatar>
//               <div className="grid flex-1 text-left text-sm leading-tight">
//                 <span className="truncate font-medium">
//                   {user?.nickname || user?.username}
//                 </span>
//                 <span className="truncate text-xs">{user?.email}</span>
//               </div>
//               <ChevronsUpDown className="ml-auto size-4" />
//             </SidebarMenuButton>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent
//             className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
//             side={isMobile ? "bottom" : "right"}
//             align="end"
//             sideOffset={4}
//           >
//             <DropdownMenuLabel className="p-0 font-normal">
//               <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
//                 <Avatar className="h-8 w-8 rounded-lg">
//                   <AvatarImage src={user?.avatar} alt={user?.username} />
//                   <AvatarFallback className="rounded-lg">
//                     {user?.username?.charAt(0).toUpperCase() || "U"}
//                   </AvatarFallback>
//                 </Avatar>
//                 <div className="grid flex-1 text-left text-sm leading-tight">
//                   <span className="truncate font-medium">
//                     {user?.nickname || user?.username}
//                   </span>
//                   <span className="truncate text-xs">{user?.email}</span>
//                 </div>
//               </div>
//             </DropdownMenuLabel>
//             <DropdownMenuSeparator />
//             <DropdownMenuGroup>
//               <DropdownMenuItem>
//                 <Sparkles className="mr-2 h-4 w-4" />
//                 <span>升級到專業版</span>
//               </DropdownMenuItem>
//             </DropdownMenuGroup>
//             <DropdownMenuSeparator />
//             <DropdownMenuGroup>
//               <DropdownMenuItem>
//                 <BadgeCheck className="mr-2 h-4 w-4" />
//                 <span>帳戶設定</span>
//               </DropdownMenuItem>
//               <DropdownMenuItem>
//                 <CreditCard className="mr-2 h-4 w-4" />
//                 <span>付款方式</span>
//               </DropdownMenuItem>
//               <DropdownMenuItem>
//                 <Bell className="mr-2 h-4 w-4" />
//                 <span>通知設定</span>
//               </DropdownMenuItem>
//             </DropdownMenuGroup>
//             <DropdownMenuSeparator />
//             <DropdownMenuItem onClick={handleLogout}>
//               <LogOut className="mr-2 h-4 w-4" />
//               <span>登出</span>
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       </SidebarMenuItem>
//     </SidebarMenu>
//   );
// }
