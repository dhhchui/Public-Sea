"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import CommentList from "../../../components/CommentList";
import LikeButton from "../../../components/LikeButton";

export default function PostPage() {
  const [post, setPost] = useState(null);
  const [commentContent, setCommentContent] = useState("");
  const [error, setError] = useState("");
  const [likeStatuses, setLikeStatuses] = useState({});
  const router = useRouter();
  const params = useParams();
  const { postId, board } = params;
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/boards/${board}/${postId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPost(data.post);
        } else {
          const data = await res.json();
          setError(data.message || "無法載入貼文");
        }
      } catch (error) {
        console.error("錯誤載入貼文:", error);
        setError("錯誤載入貼文: " + error.message);
      }
    };

    fetchPost();
  }, [postId, board]);

  useEffect(() => {
    if (!post) return;

    const fetchLikeStatuses = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const items = [
          { itemId: post.id, itemType: "post" },
          ...post.comments.map((comment) => ({
            itemId: comment.id,
            itemType: "comment",
          })),
        ];

        const res = await fetch("/api/like-status/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items }),
        });

        if (res.ok) {
          const data = await res.json();
          const statusMap = data.statuses.reduce((acc, status) => {
            const key = `${status.itemType}-${status.itemId}`;
            acc[key] = status.liked;
            return acc;
          }, {});
          setLikeStatuses(statusMap);
        }
      } catch (error) {
        console.error("錯誤載入按讚狀態:", error);
      }
    };

    fetchLikeStatuses();
  }, [post]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: parseInt(postId),
          content: commentContent,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCommentContent("");
        setPost((prev) => ({
          ...prev,
          comments: [...prev.comments, data.comment],
        }));
        setLikeStatuses((prev) => ({
          ...prev,
          [`comment-${data.comment.id}`]: false,
        }));
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("錯誤提交留言:", error);
      setError("提交留言時發生錯誤，請再試一次。");
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="w-full max-w-2xl p-6">
          <p className="text-red-500 text-center">{error}</p>
          <button
            onClick={() => router.push(`/boards/${board}`)}
            className="w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            返回貼文列表
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div>載入中...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">{post.title}</h2>
        <p className="text-gray-700 mb-4">{post.content}</p>
        <p className="text-gray-500 text-sm mb-2">
          由{" "}
          <span
            onClick={() => router.push(`/user-profile/${post.authorId}`)}
            className="cursor-pointer text-blue-500 hover:underline"
          >
            {post.author.username}
          </span>{" "}
          於 {new Date(post.createdAt).toLocaleString()} 發佈
        </p>
        <p className="text-gray-500 text-sm mb-2">瀏覽次數: {post.view}</p>
        <div className="flex items-center mb-4">
          <LikeButton
            itemId={post.id}
            itemType="post"
            initialLikeCount={post.likeCount}
            initialLiked={likeStatuses[`post-${post.id}`] || false}
          />
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-bold mb-2">新增留言</h3>
          {error && <p className="text-red-500 mb-2">{error}</p>}
          <form onSubmit={handleCommentSubmit}>
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="撰寫您的留言..."
              className="w-full p-2 border rounded mb-2"
              rows="3"
              required
            />
            <button
              type="submit"
              className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              提交留言
            </button>
          </form>
        </div>
        <CommentList
          postId={parseInt(postId)}
          comments={post.comments}
          likeStatuses={likeStatuses}
        />
        <button
          onClick={() => router.push(`/boards/${board}`)}
          className="w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          返回貼文列表
        </button>
      </div>
    </div>
  );
}