"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flag, Flame } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PopularPosts() {
  const [popularPosts, setPopularPosts] = useState([]);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPopularPosts = async () => {
      try {
        const res = await fetch("/api/popular-posts", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPopularPosts(data.posts.slice(0, 5));
        } else {
          setMessage({ text: "無法載入熱門貼文", type: "error" });
        }
      } catch (error) {
        console.error("Error fetching popular posts:", error);
        setMessage({ text: "無法載入熱門貼文，可能是伺服器或資料庫連線問題。", type: "error" });
      }
    };

    fetchPopularPosts();
  }, []);

  const getIconStyleByRank = (rank) => {
    const sizes = [24, 22, 20, 18, 16];
    const opacities = [0.8, 0.75, 0.5, 0.35, 0.2];
    return {
      size: sizes[rank - 1] || 16,
      opacity: opacities[rank - 1] || 0.2,
    };
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-gray-700">
          🔥 熱門貼文
        </CardTitle>
      </CardHeader>
      <CardContent>
        {message && (
          <div
            className={`p-3 mb-4 rounded ${
              message.type === "error"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}
        {popularPosts.length === 0 && !message && (
          <p className="text-gray-500">暫無熱門貼文</p>
        )}
        {popularPosts.length > 0 && (
          <div className="grid gap-4">
            {popularPosts.map((post, index) => {
              const rank = index + 1;
              const { size, opacity } = getIconStyleByRank(rank);
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer flex items-start"
                  onClick={() => router.push(`/view-post/${post.id}`)}
                >
                  <Flame
                    className="mr-3 flex-shrink-0 hover:scale-110 transition-all duration-200"
                    style={{
                      color: `rgba(255, 82, 82, ${opacity})`,
                    }}
                    size={size}
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-blue-600 hover:underline">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mt-1 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                      <span className="flex items-center">
                        由{" "}
                        <span
                          className={`ml-1 ${
                            post.author?.isRedFlagged ? "text-red-500" : ""
                          }`}
                        >
                          {post.author?.nickname || "匿名用戶"}
                        </span>
                        {post.author?.isRedFlagged && (
                          <Flag className="ml-1 h-4 w-4 text-red-500" />
                        )}
                      </span>
                      <span>👁️ {post.view}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}