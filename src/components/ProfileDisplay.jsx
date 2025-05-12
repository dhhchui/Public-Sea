import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // 新增 Dialog 組件
import RatingModal from "@/components/RatingModal";

export default function ProfileDisplay({
  user,
  userId,
  isFollowing,
  handleFollow,
  handleUnfollow,
  setIsEditing,
  showFollowers,
  setShowFollowers,
  showFollowing,
  setShowFollowing,
  router,
}) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [error, setError] = useState("");
  const [blockedList, setBlockedList] = useState([]); // 新增封鎖列表狀態
  const [isBlockedListOpen, setIsBlockedListOpen] = useState(false); // 新增模態框狀態
  const [blockedListLoading, setBlockedListLoading] = useState(false); // 新增加載狀態
  const [blockedListError, setBlockedListError] = useState(""); // 新增錯誤狀態

  // 檢查封鎖狀態
  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const response = await fetch("/api/blocked-users", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const blocked = data.blockedList.some((blockedUser) => blockedUser.id === parseInt(userId));
          setIsBlocked(blocked);
          setBlockedList(data.blockedList); // 儲存封鎖列表
        }
      } catch (err) {
        console.error("Error checking block status:", err);
      }
    };
    if (parseInt(userId) !== JSON.parse(localStorage.getItem("user") || "{}")?.userId) {
      checkBlockStatus();
    }
  }, [userId]);

  // 獲取封鎖列表（模態框打開時）
  const fetchBlockedUsers = async () => {
    setBlockedListLoading(true);
    try {
      const response = await fetch("/api/blocked-users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBlockedList(data.blockedList);
        setBlockedListError("");
      } else if (response.status === 401 || response.status === 403) {
        router.push("/login");
      } else {
        const errorData = await response.json();
        setBlockedListError(errorData.message || "伺服器錯誤，請稍後重試");
      }
    } catch (error) {
      setBlockedListError("網絡錯誤，請稍後重試");
    } finally {
      setBlockedListLoading(false);
    }
  };

  // 處理封鎖
  const handleBlock = async () => {
    try {
      const response = await fetch("/api/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ blockedUserId: parseInt(userId) }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsBlocked(true);
        setError("");
        setBlockedList((prev) => [...prev, { id: parseInt(userId), nickname: user.nickname }]);
        if (isFollowing) {
          handleUnfollow();
        }
      } else if (response.status === 401 || response.status === 403) {
        router.push("/login");
      } else {
        setError(data.message || "封鎖失敗，請稍後重試");
      }
    } catch (error) {
      setError("網絡錯誤，請稍後重試");
    }
  };

  // 處理取消封鎖
  const handleUnblock = async (blockedUserId) => {
    const confirmed = window.confirm("確定要取消封鎖此用戶嗎？");
    if (!confirmed) return;

    try {
      const response = await fetch("/api/unblock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ blockedUserId }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsBlocked(blockedUserId === parseInt(userId) ? false : isBlocked);
        setBlockedList((prev) => prev.filter((user) => user.id !== blockedUserId));
        setError("");
        setBlockedListError("");
      } else if (response.status === 401 || response.status === 403) {
        router.push("/login");
      } else {
        setError(data.message || "取消封鎖失敗，請稍後重試");
      }
    } catch (error) {
      setError("網絡錯誤，請稍後重試");
    }
  };

  // 打開黑名單模態框
  const handleOpenBlockedList = () => {
    setIsBlockedListOpen(true);
    fetchBlockedUsers();
  };

  return (
    <>
      <Card className="mb-8 shadow-lg rounded-xl border border-gray-200">
        <CardHeader className="bg-white rounded-t-xl p-6">
          <CardTitle className="text-3xl font-bold text-gray-800">
            {user.nickname || user.username} 的個人資料
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6 bg-gray-50 rounded-b-xl">
          {user.isRedFlagged && (
            <p className="text-red-500 text-sm font-medium">
              注意：此用戶帳戶已被限制
            </p>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-lg font-medium text-gray-700">暱稱: {user.nickname}</p>
                <p className="text-gray-600">用戶名: {user.username}</p>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">簡介:</p>
                <p className="text-gray-600">{user.bio || "未設置簡介"}</p>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">興趣:</p>
                <p className="text-gray-600">
                  {user.hobbies && user.hobbies.length > 0 ? user.hobbies.join(", ") : "未設置興趣"}
                </p>
              </div>
              <div>
                <p className={`text-lg font-medium ${user.rating < 0 ? "text-red-600" : "text-gray-700"}`}>
                  評分: {user.rating || 0}
                </p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Followers: {user.followerCount}
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setShowFollowers(true)}
                    className="p-0 text-blue-500 hover:underline"
                  >
                    View Followers
                  </Button>
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Following: {user.followedCount}
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setShowFollowing(true)}
                    className="p-0 text-blue-500 hover:underline"
                  >
                    View Following
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 items-center flex-wrap">
              {parseInt(userId) !== JSON.parse(localStorage.getItem("user") || "{}")?.userId && (
                <>
                  <Button
                    onClick={isFollowing ? handleUnfollow : handleFollow}
                    className={`${isFollowing ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white font-semibold py-2 px-4 rounded-md`}
                    disabled={user.isRedFlagged || isBlocked}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                  <RatingModal
                    ratedUserId={parseInt(userId)}
                    onRatingSubmitted={() => {
                      fetch(`/api/user-profile/${userId}`, {
                        method: "GET",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
                        },
                      })
                        .then((res) => res.json())
                        .then((data) => {
                          if (res.ok) {
                            setUser(data.user); // 假設 setUser 由父組件傳入
                          }
                        })
                        .catch((err) => console.error("Error refreshing user:", err));
                    }}
                    disabled={isBlocked}
                  />
                  <Button
                    onClick={isBlocked ? handleUnblock : handleBlock}
                    className={`${isBlocked ? "bg-gray-500 hover:bg-gray-600" : "bg-orange-500 hover:bg-orange-600"} text-white font-semibold py-2 px-4 rounded-md`}
                  >
                    {isBlocked ? "取消封鎖" : "封鎖"}
                  </Button>
                </>
              )}
              {parseInt(userId) === JSON.parse(localStorage.getItem("user") || "{}")?.userId && (
                <>
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md"
                  >
                    Edit Profile
                  </Button>
                  <Button
                    onClick={handleOpenBlockedList}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md"
                  >
                    查看黑名單
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 黑名單模態框 */}
      <Dialog open={isBlockedListOpen} onOpenChange={setIsBlockedListOpen}>
        <DialogContent className="max-w-2xl p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">黑名單</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {blockedListLoading ? (
              <p className="text-gray-500 text-center">載入中...</p>
            ) : blockedListError ? (
              <p className="text-red-500 bg-red-100 p-3 rounded-md text-center">{blockedListError}</p>
            ) : blockedList.length === 0 ? (
              <p className="text-gray-500 text-center">您尚未封鎖任何用戶</p>
            ) : (
              <ul className="list-none space-y-2">
                {blockedList.map((blockedUser) => (
                  <li
                    key={blockedUser.id}
                    className="flex justify-between items-center p-3 border-b rounded-lg bg-white hover:bg-gray-100"
                  >
                    <span
                      onClick={() => router.push(`/user-profile/${blockedUser.id}`)}
                      className="cursor-pointer text-blue-500 hover:underline"
                    >
                      {blockedUser.nickname || "未知用戶"}
                    </span>
                    <Button
                      onClick={() => handleUnblock(blockedUser.id)}
                      variant="destructive"
                      className="py-1 px-3"
                    >
                      取消封鎖
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}