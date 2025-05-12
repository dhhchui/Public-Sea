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

export default function ChatModal({ isOpen, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newConversationUser, setNewConversationUser] = useState("");
  const [error, setError] = useState("");
  const [pusher, setPusher] = useState(null);

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

  // 載入對話列表
  useEffect(() => {
    if (!isOpen) return;

    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("請先登入");
          return;
        }

        const res = await fetch("/api/conversations", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get("content-type");
        const responseText = await res.text();
        console.log("Response Content-Type for /api/conversations:", contentType);

        try {
          const data = JSON.parse(responseText);
          if (res.ok) {
            setConversations(data.conversations || []);
            setError("");
          } else {
            setError(data.message || "無法載入對話列表");
          }
        } catch (err) {
          console.error("Unexpected response format:", responseText);
          setError("伺服器響應格式錯誤");
          return;
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError("載入對話列表時發生錯誤");
      }
    };

    fetchConversations();
  }, [isOpen]);

  // 載入消息
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("請先登入");
          return;
        }

        console.log(`Fetching messages for conversation ID: ${selectedConversation.id}`);
        const res = await fetch(`/api/conversation/${selectedConversation.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get("content-type");
        const responseText = await res.text();
        console.log("Response Content-Type for /api/conversation/[conversationId]:", contentType);
        console.log("Response body for /api/conversation/[conversationId]:", responseText);

        try {
          const data = JSON.parse(responseText);
          if (res.ok) {
            console.log("Messages fetched:", data.conversation.messages || []);
            setMessages(data.conversation.messages || []);
            setError("");
          } else {
            setError(data.message || "無法載入訊息");
          }
        } catch (err) {
          console.error("Unexpected response format:", responseText);
          setError("伺服器響應格式錯誤");
          return;
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError("載入訊息時發生錯誤");
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  // 開始新對話
  const handleStartNewConversation = async () => {
    if (!newConversationUser) {
      setError("請輸入用戶名稱");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("請先登入");
        return;
      }

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newConversationUser }),
      });

      const contentType = res.headers.get("content-type");
      const responseText = await res.text();
      console.log("Response Content-Type for /api/conversations (POST):", contentType);
      console.log("Response body for /api/conversations (POST):", responseText);

      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          const newConversation = { ...data.conversation, messages: [] }; // 確保新對話包含空 messages 陣列
          setConversations([...conversations, newConversation]);
          setSelectedConversation(newConversation);
          setNewConversationUser("");
          setMessages([]); // 重置消息列表
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
      setError("創建新對話時發生錯誤");
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
          // 新版不返回消息對象，需等待 Pusher 推送
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
      setError("發送訊息時發生錯誤");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex p-0 rounded-lg shadow-lg border border-slate-200">
        {/* 左側：對話列表 */}
        <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
          <DialogHeader className="p-4 bg-white border-b border-slate-200">
            <DialogTitle className="text-lg font-semibold text-slate-800">對話</DialogTitle>
          </DialogHeader>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2 mb-4">
              <Input
                placeholder="輸入用戶名稱開始新對話"
                value={newConversationUser}
                onChange={(e) => setNewConversationUser(e.target.value)}
                className="w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-500"
              />
              <Button
                onClick={handleStartNewConversation}
                className="bg-slate-600 text-white hover:bg-slate-700 rounded-lg w-full"
              >
                搜尋用戶
              </Button>
            </div>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <ConversationList
              conversations={conversations}
              onSelectConversation={setSelectedConversation}
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
                  {selectedConversation.user1Id === JSON.parse(localStorage.getItem("user"))?.userId
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
                      message.senderId === JSON.parse(localStorage.getItem("user"))?.userId;
                    return (
                      <div
                        key={message.id}
                        className={`mb-3 flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
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
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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