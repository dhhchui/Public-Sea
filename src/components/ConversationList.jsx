"use client";

import { Button } from "@/components/ui/button";

export default function ConversationList({
  conversations,
  onSelectConversation,
  selectedConversationId,
}) {
  const currentUserId = JSON.parse(localStorage.getItem("user"))?.userId;

  return (
    <div className="space-y-1">
      {conversations.map((conversation) => {
        const otherUser =
          conversation.user1Id === currentUserId
            ? conversation.user2
            : conversation.user1;

        return (
          <Button
            key={conversation.id}
            variant="ghost"
            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${
              conversation.id === selectedConversationId
                ? "bg-slate-200"
                : "hover:bg-slate-100"
            }`}
            onClick={() => onSelectConversation(conversation)}
          >
            <div className="flex-1">
              <p className="text-slate-800 font-medium">{otherUser.nickname}</p>
            </div>
          </Button>
        );
      })}
    </div>
  );
}