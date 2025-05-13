import { useState, useEffect } from "react";
import { Backdrop } from "./Backdrop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function FollowPanel({ user, isOpen, onClose }) {
  const router = useRouter();
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFollowData = async () => {
    setIsLoading(true);
    try {
      // 獲取當前用戶資料
      console.log("Fetching current user data from /api/user-profile");
      const currentUserRes = await fetch("/api/user-profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!currentUserRes.ok) {
        const errorText = await currentUserRes.text();
        console.error("Current user fetch failed:", currentUserRes.status, errorText);
        setError("無法載入當前用戶資料");
        return;
      }
      const currentUserData = await currentUserRes.json();
      console.log("Current user data:", currentUserData);
      setCurrentUser(currentUserData.user);

      // 獲取目標用戶的關注資料
      console.log(`Fetching user data for userId: ${user.userId}`);
      const res = await fetch(`/api/user-profile/${user.userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("User fetch failed:", res.status, errorText);
        setError("無法載入關注資料");
        return;
      }
      const data = await res.json();
      console.log("User data:", data);

      // 從 followerIds 和 followedIds 查詢用戶資料
      const followerIds = data.user.followerIds || [];
      const followedIds = data.user.followedIds || [];

      // 使用 /api/users-by-ids 獲取 followers 和 following 的詳細資料
      const fetchUsers = async (ids) => {
        if (ids.length === 0) return [];
        const usersRes = await fetch("/api/users-by-ids", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ userIds: ids }),
        });
        const usersData = await usersRes.json();
        if (!usersRes.ok) {
          throw new Error(usersData.message || "無法載入用戶資料");
        }
        return usersData.users || [];
      };

      const followersData = await fetchUsers(followerIds);
      const followingData = await fetchUsers(followedIds);

      setFollowers(followersData);
      setFollowing(followingData);
    } catch (error) {
      console.error("Error fetching follow data:", error);
      setError("載入關注資料時發生錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.userId) {
      fetchFollowData();
    }
  }, [isOpen, user]);

  const handleFollow = async (targetUserId) => {
    if (!targetUserId) {
      setError("無效的用戶 ID");
      return;
    }
    console.log("Sending follow request for targetUserId:", targetUserId);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchFollowData();
        alert("關注成功！");
        setError("");
      } else {
        setError(data.message || "關注失敗");
      }
    } catch (error) {
      console.error("Error in handleFollow:", error);
      setError("關注時發生錯誤");
    }
  };

  const handleUnfollow = async (targetUserId) => {
    if (!targetUserId) {
      setError("無效的用戶 ID");
      return;
    }
    console.log("Sending unfollow request for targetUserId:", targetUserId);
    try {
      const res = await fetch("/api/unfollow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchFollowData();
        alert("取消關注成功！");
        setError("");
      } else {
        setError(data.message || "取消關注失敗");
      }
    } catch (error) {
      console.error("Error in handleUnfollow:", error);
      setError("取消關注時發生錯誤");
    }
  };

  if (!isOpen) return null;

return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-60">
        <Card className="w-full max-w-lg bg-white opacity-100 shadow-lg backdrop-blur-none">
          <CardHeader>
            <CardTitle>關注管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-black">
            <div>
              <h3 className="font-semibold">關注我的人</h3>
              {isLoading ? (
                <p className="text-gray-500">正在載入...</p>
              ) : followers.length > 0 ? (
                followers.map((follower) => {
                  const isFollowing = currentUser?.followedIds?.includes(follower.id) || false;
                  return (
                    <div
                      key={follower.id}
                      className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md"
                    >
                      <span
                        className="cursor-pointer"
                        onClick={() => router.push(`/user-profile/${follower.id}`)}
                      >
                        {follower.nickname || follower.username}
                      </span>
                      {!isFollowing && (
                        <Button
                          onClick={() => handleFollow(follower.id)}
                          className="bg-green-500 text-white hover:bg-green-600"
                        >
                          關注
                        </Button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>暫無關注者</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold">我關注的人</h3>
              {isLoading ? (
                <p className="text-gray-500">正在載入...</p>
              ) : following.length > 0 ? (
                following.map((followed) => (
                  <div
                    key={followed.id}
                    className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md"
                  >
                    <span
                      className="cursor-pointer"
                      onClick={() => router.push(`/user-profile/${followed.id}`)}
                    >
                      {followed.nickname || followed.username}
                    </span>
                    <Button
                      onClick={() => handleUnfollow(followed.id)}
                      className="bg-red-500 text-white hover:bg-red-600"
                    >
                      取消關注
                    </Button>
                  </div>
                ))
              ) : (
                <p>暫無關注</p>
              )}
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <Button onClick={onClose} className="w-full mt-4">
              關閉
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}