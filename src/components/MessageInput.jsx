"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MessageInput({ onSendMessage }) {
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (content.trim()) {
      onSendMessage(content);
      setContent("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="輸入訊息..."
        className="flex-1 rounded-lg border-slate-200 focus:ring-blue-500"
      />
      <Button
        type="submit"
        className="bg-blue-500 text-white hover:bg-blue-600 rounded-lg px-4"
      >
        發送
      </Button>
    </form>
  );
}