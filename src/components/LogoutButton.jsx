"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    console.log("User logged out");
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full p-2 mt-4 bg-red-500 text-white rounded hover:bg-red-600"
    >
      Logout
    </button>
  );
}
