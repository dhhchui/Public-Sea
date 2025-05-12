"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConversationList from "@/components/ConversationList";
import MessageInput from "@/components/MessageInput";
import Pusher from "pusher-js";
import useSWR from "swr";

// 自訂 fetcher 函數給 useSWR 使用
const fetcher = async (url) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("請先登入");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = res.headers.get("content-type");
  const responseText = await res.text();
  console.log(`Response Content-Type for ${url}:`, contentType);
  console.log(`Response body for ${url}:`, responseText);

  try {
    const data = JSON.parse(responseText);
    if (!res.ok) {
      throw new Error(data.message || `無法載入數據 from ${url}`);
    }
    return data;
  } catch (err) {
    console.error(`Unexpected response format for ${url}:`, responseText);
    throw new Error("伺服器響應格式錯誤");
  }
};

export default function ChatModal({ isOpen, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newConversationUser, setNewConversationUser] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [pusher, setPusher] = useState(null);
  const [userId, setUserId] = useState(null);

  // 初始化 Pusher
  useEffect(() => {
    if (!isOpen) return;

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      encrypted: true,
    });
    setPusher(pusherClient);

    return () => {
      pusherClient.disconnect();
    };
  }, [isOpen]);

  // 監聽 Pusher 消息
  useEffect(() => {
    if (!pusher || !selectedConversation) return;

    const channel = pusher.subscribe(`conversation-${selectedConversation.id}`);
    channel.bind("new-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [pusher, selectedConversation]);

  // 獲取當前用戶 ID
  useEffect(() => {
    if (!isOpen) return;

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserId = userData?.userId ? parseInt(userData.userId) : null;
    if (!currentUserId) {
      setError("無法獲取用戶資訊，請重新登入");
      onClose();
      return;
    }
    setUserId(currentUserId);
  }, [isOpen, onClose]);

  // 使用 useSWR 快取對話列表
  const { data: conversationsData, error: conversationsError } = useSWR(
    userId ? `/api/conversations` : null,
    fetcher,
    {
      revalidateOnFocus: false, // 不自動在焦點時重新驗證
      dedupingInterval: 86400000, // 快取 24 小時（86400秒）
      onError: (err) => {
        setError(err.message || "載入對話列表時發生錯誤");
        onClose();
      },
    }
  );

  useEffect(() => {
    if (conversationsData) {
      setConversations(conversationsData.conversations || []);
      setError("");
    }
  }, [conversationsData]);

  // 使用 useSWR 快取消息
  const { data: messagesData, error: messagesError } = useSWR(
    selectedConversation
      ? `/api/conversation/${selectedConversation.id}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false, // 不自動在焦點時重新驗證
      dedupingInterval: 300000, // 快取 5 分鐘（300秒）
      onError: (err) => {
        setError(err.message || "載入訊息時發生錯誤");
      },
    }
  );

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    if (messagesData) {
      setMessages(messagesData.conversation?.messages || []);
      setError("");
    }
  }, [messagesData, selectedConversation]);

  // 搜索用戶（模擬搜索）
  const handleSearchUsers = async () => {
    if (!newConversationUser.trim()) {
      setError("請輸入電子郵件或暱稱");
      setSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("請先登入");
        onClose();
        return;
      }

      console.log("Sending search request:", {
        emailOrNickname: newConversationUser,
      });

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emailOrNickname: newConversationUser }),
      });

      const contentType = res.headers.get("content-type");
      const responseText = await res.text();
      console.log(
        "Response Content-Type for /api/conversations (POST):",
        contentType
      );
      console.log("Response body for /api/conversations (POST):", responseText);

      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          setSearchResults(data.users || []);
          setError("");
        } else {
          setError(data.message || "無法找到用戶");
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Unexpected response format:", responseText);
        setError("伺服器響應格式錯誤");
        setSearchResults([]);
        return;
      }
    } catch (err) {
      console.error("Error searching users:", err);
      setError("搜索用戶時發生錯誤：" + err.message);
      setSearchResults([]);
    }
  };

  // 選擇用戶並開始新對話
  const handleStartNewConversation = async (targetUserId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("請先登入");
        onClose();
        return;
      }

      console.log("Sending new conversation request:", { targetUserId });

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      const contentType = res.headers.get("content-type");
      const responseText = await res.text();
      console.log(
        "Response Content-Type for /api/conversations (POST):",
        contentType
      );
      console.log("Response body for /api/conversations (POST):", responseText);

      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          const newConversation = { ...data.conversation, messages: [] };
          setConversations((prev) => {
            const exists = prev.find((conv) => conv.id === newConversation.id);
            if (exists) {
              return prev;
            }
            return [newConversation, ...prev];
          });
          setSelectedConversation(newConversation);
          setNewConversationUser("");
          setSearchResults([]);
          setMessages([]);
          setError("");
        } else {
          setError(data.message || "無法創建新對話");
        }
      } catch (err) {
        console.error("Unexpected response format:", responseText);
        setError("伺服器響應格式錯誤");
        return;
      }
    } catch (err) {
      console.error("Error starting new conversation:", err);
      setError("創建新對話時發生錯誤：" + err.message);
    }
  };

  // 發送消息
  const handleSendMessage = async (content) => {
    if (!selectedConversation || !content) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("請先登入");
        return;
      }

      const user = JSON.parse(localStorage.getItem("user"));
      const receiverId =
        selectedConversation.user1Id === user?.userId
          ? selectedConversation.user2Id
          : selectedConversation.user1Id;

      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId,
          content,
        }),
      });

      const contentType = res.headers.get("content-type");
      const responseText = await res.text();
      console.log("Response Content-Type for /api/send-message:", contentType);
      console.log("Response body for /api/send-message:", responseText);

      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          setError("");
        } else {
          setError(data.message || "無法發送訊息");
        }
      } catch (err) {
        console.error("Unexpected response format:", responseText);
        setError("伺服器響應格式錯誤");
        return;
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("發送訊息時發生錯誤：" + err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex p-0 rounded-lg shadow-lg border border-slate-200">
        {/* 左側：對話列表 */}
        <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
          <DialogHeader className="p-4 bg-white border-b border-slate-200">
            <DialogTitle className="text-lg font-semibold text-slate-800">
              對話
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2 mb-4">
              <Input
                placeholder="輸入電子郵件或暱稱開始新對話"
                value={newConversationUser}
                onChange={(e) => setNewConversationUser(e.target.value)}
                className="w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-500"
              />
              <Button
                onClick={handleSearchUsers}
                className="bg-slate-600 text-white hover:bg-slate-700 rounded-lg w-full"
              >
                搜尋用戶
              </Button>
            </div>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            {searchResults.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  搜索結果
                </p>
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-2 border rounded cursor-pointer hover:bg-gray-100"
                      onClick={() => handleStartNewConversation(user.id)}
                    >
                      <p className="font-medium">{user.nickname}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ConversationList
              conversations={conversations}
              onSelectConversation={(conv) => {
                setSelectedConversation(conv);
                setSearchResults([]);
              }}
              selectedConversationId={selectedConversation?.id}
            />
          </div>
        </div>

        {/* 右側：聊天區域 */}
        <div className="w-2/3 flex flex-col">
          <span id="dialog-description" className="sr-only">
            這是一個用於私聊的對話視窗，顯示對話列表和訊息內容。
          </span>
          {selectedConversation ? (
            <>
              <DialogHeader className="p-4 bg-white border-b border-slate-200 flex items-center">
                <DialogTitle className="text-lg font-semibold text-slate-800">
                  與{" "}
                  {selectedConversation.user1Id ===
                  JSON.parse(localStorage.getItem("user"))?.userId
                    ? selectedConversation.user2.nickname
                    : selectedConversation.user1.nickname}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-500">開始聊天吧！</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage =
                      message.senderId ===
                      JSON.parse(localStorage.getItem("user"))?.userId;
                    return (
                      <div
                        key={message.id}
                        className={`mb-3 flex ${
                          isOwnMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg shadow-sm relative ${
                            isOwnMessage
                              ? "bg-slate-100 text-slate-800 message-bubble-right"
                              : "bg-white text-slate-800 message-bubble-left"
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className="text-xs text-slate-500 mt-1 text-right">
                            {new Date(message.createdAt).toLocaleString(
                              "zh-HK",
                              {
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                          <div
                            className={`absolute top-0 w-4 h-4 ${
                              isOwnMessage
                                ? "right-[-8px] bg-slate-100 message-tail-right"
                                : "left-[-8px] bg-white message-tail-left"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-white border-t border-slate-200">
                <MessageInput onSendMessage={handleSendMessage} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <p className="text-slate-500">選擇一個對話開始聊天</p>
            </div>
          )}
        </div>
      </DialogContent>

      <style jsx>{`
        .message-bubble-right {
          border-top-right-radius: 0;
        }
        .message-bubble-left {
          border-top-left-radius: 0;
        }
        .message-tail-right {
          clip-path: polygon(0 0, 100% 0, 0 100%);
        }
        .message-tail-left {
          clip-path: polygon(0 0, 100% 0, 100% 100%);
        }
      `}</style>
    </Dialog>
  );
}
