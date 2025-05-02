"use client";

import { useState } from "react";
import { Backdrop } from "@/components/backdrop";
import { RegisterForm } from "@/components/register-form"
import { LoginForm } from "@/components/login-form"

import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogIn,
  LogOut,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";

// import {
//   Avatar,
//   AvatarFallback,
//   AvatarImage,
// } from "@/components/ui/avatar"
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

export function NavUser() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const handleRegisterClick = () => {
    router.push("/register");
  };

  const handleLoginClick = () => {
    router.push("/login");
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  const [isRegisterOverlayOpen, setIsRegisterOverlayOpen] = useState(false); // State to control overlay visibility

  const toggleRegisterOverlay = () => {
    setIsRegisterOverlayOpen(!isRegisterOverlayOpen);
  };

  const [isLoginOverlayOpen, setIsLoginOverlayOpen] = useState(false); // State to control overlay visibility

  const toggleLoginOverlay = () => {
    setIsLoginOverlayOpen(!isLoginOverlayOpen);
  };

  if (!isLoggedIn) {
    return (
      <>
        {/* <div className="flex gap-4 p-4">
          <button
            onClick={handleRegisterClick}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            註冊
          </button>
          <button
            onClick={handleLoginClick}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            登入
          </button>
        </div> */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
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
                sideOffset={4}>
                {/* <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <Sparkles />
                        Upgrade to Pro
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator /> */}
                <DropdownMenuGroup>
                  {/* <DropdownMenuItem>
                        <BadgeCheck />
                        Account
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CreditCard />
                        Billing
                      </DropdownMenuItem> */}
                  <DropdownMenuItem onClick={toggleRegisterOverlay}>
                    <UserRoundPlus />
                    註冊
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleLoginOverlay}>
                  <LogIn />
                  登入
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Overlay Login Form */}
        {isRegisterOverlayOpen && (
          <>
            <Backdrop onClick={toggleRegisterOverlay} />
              <RegisterForm />
          </>
        )}

        {/* Overlay Login Form */}
        {isLoginOverlayOpen && (
          <>
            <Backdrop onClick={toggleLoginOverlay} />
            <LoginForm />
          </>
        )
        }
      </>
    );
  } else {

    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  {/* <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar> */}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}>
                {/* <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator /> */}
                {/* <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Sparkles />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator /> */}
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <BadgeCheck />
                    帳號
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem>
                    <CreditCard />
                    Billing
                  </DropdownMenuItem> */}
                  <DropdownMenuItem>
                    <Bell />
                    通知
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleLoginOverlay}>
                  <LogOut />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Overlay Login Form */}
        {isLoginOverlayOpen && (
          <>
            <Backdrop onClick={toggleLoginOverlay} />
              <LoginForm />
          </>
        )}
      </>
    );
  }
}
