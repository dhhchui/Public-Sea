import { useState, useEffect } from "react";
import { Backdrop } from "./backdrop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function FriendPanel({ user, isOpen, onClose }) {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [newFriendQuery, setNewFriendQuery] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.userId) {
      const fetchFriendData = async () => {
        setIsLoading(true);
        try {
          const friendsRes = await fetch("/api/friends", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          });
          const friendsData = await friendsRes.json();
          if (friendsRes.ok) {
            setFriends(friendsData.friends);
          } else {
            setError(friendsData.message || "無法載入好友列表");
          }

          const requestsRes = await fetch("/api/friend-request/list", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          });
          const requestsData = await requestsRes.json();
          if (requestsRes.ok) {
            setFriendRequests(requestsData.requests);
          } else {
            setError(requestsData.message || "無法載入好友請求");
          }
        } catch (error) {
          console.error("Error fetching friend data:", error);
          setError("載入好友資料時發生錯誤");
        } finally {
          setIsLoading(false);
        }
      };
      fetchFriendData();
    }
  }, [isOpen, user]);

  const handleRespondRequest = async (requestId, action) => {
    try {
      const res = await fetch("/api/friend-request/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriendRequests((prev) =>
          prev.filter((req) => req.id !== parseInt(requestId))
        );
        if (action === "accept") {
          setFriends((prev) => [
            ...prev,
            friendRequests.find((req) => req.id === parseInt(requestId)).sender,
          ]);
        }
        alert(data.message);
      } else {
        setError(data.message || "處理好友請求失敗");
      }
    } catch (error) {
      console.error("Error responding to friend request:", error);
      setError("處理好友請求時發生錯誤");
    }
  };

  const handleSendFriendRequest = async () => {
    if (!newFriendQuery) {
      setError("請輸入用戶名或暱稱");
      return;
    }

    try {
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ query: newFriendQuery }),
      });
      const searchData = await searchRes.json();
      if (searchRes.ok && searchData.users.length > 0) {
        const targetUser = searchData.users[0];
        const sendRes = await fetch("/api/friend-request/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ receiverId: targetUser.id }),
        });
        const sendData = await sendRes.json();
        if (sendRes.ok) {
          alert("好友請求已發送！");
          setNewFriendQuery("");
        } else {
          setError(sendData.message || "發送好友請求失敗");
        }
      } else {
        setError("找不到該用戶");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      setError("發送好友請求時發生錯誤");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-60">
        <Card className="w-full max-w-2xl bg-white opacity-100 shadow-lg">
          <CardHeader>
            <CardTitle>好友管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-black p-6">
            <div>
              <h3 className="font-semibold">我的好友</h3>
              {isLoading ? (
                <p className="text-gray-500">正在載入...</p>
              ) : friends.length > 0 ? (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md"
                  >
                    <span
                      className="cursor-pointer"
                      onClick={() => router.push(`/user-profile/${friend.id}`)}
                    >
                      {friend.nickname || friend.username}
                    </span>
                  </div>
                ))
              ) : (
                <p>暫無好友</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold">好友請求</h3>
              {isLoading ? (
                <p className="text-gray-500">正在載入...</p>
              ) : friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md"
                  >
                    <span>{request.sender.nickname || request.sender.username}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleRespondRequest(request.id, "accept")}
                      >
                        接受
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRespondRequest(request.id, "reject")}
                      >
                        拒絕
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p>暫無好友請求</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold">發送好友請求</h3>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="輸入用戶名或暱稱..."
                  value={newFriendQuery}
                  onChange={(e) => setNewFriendQuery(e.target.value)}
                />
                <Button onClick={handleSendFriendRequest}>發送</Button>
              </div>
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