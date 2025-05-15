"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import CommentList from "@/components/CommentList.jsx";
import LikeButton from "@/components/LikeButton.jsx";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Eye, MessageSquarePlus, SendHorizontal, Loader2 } from "lucide-react";
import { getPusherClient } from "@/lib/pusherClient";

const fetcher = async (url) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`伺服器錯誤: ${response.status}`);
  }

  const data = await response.json();
  return data.post;
};

const likeFetcher = async (url, { arg: { items } }) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    throw new Error(`伺服器錯誤: ${response.status}`);
  }

  const data = await response.json();
  return data.statuses;
};

export default function PostPage() {
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likeStatuses, setLikeStatuses] = useState({});
  const [isMounted, setIsMounted] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const router = useRouter();
  const { postId } = useParams();

  const { data: post, mutate } = useSWR(
    postId
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/view-post/${postId}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  useEffect(() => {
    setIsMounted(true);

    if (!post) return;

    // 初始化 Pusher
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`post-${postId}`);

    channel.bind("new-comment", (data) => {
      console.log("Received new comment via Pusher:", data);
      mutate((currentPost) => {
        if (!currentPost) return currentPost;
        // 避免重複添加
        if (currentPost.comments.some((c) => c.id === data.comment.id)) {
          return currentPost;
        }
        return {
          ...currentPost,
          comments: [...currentPost.comments, data.comment],
        };
      }, false);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [postId, post, mutate]);

  useEffect(() => {
    if (!post) return;

    const fetchLikeStatuses = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          console.log("No user in localStorage, skipping like status fetch");
          return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
          console.log("No token found, skipping like status fetch");
          return;
        }

        const items = [
          { itemId: post.id, itemType: "post" },
          ...post.comments.map((comment) => ({
            itemId: comment.id,
            itemType: "comment",
          })),
        ];

        const statuses = await likeFetcher("/api/like-status/batch", {
          arg: { items },
        });
        const statusMap = statuses.reduce((acc, status) => {
          const key = `${status.itemType}-${status.itemId}`;
          acc[key] = status.liked;
          return acc;
        }, {});
        setLikeStatuses(statusMap);
        console.log("Like statuses fetched:", statusMap);
      } catch (error) {
        console.error("錯誤載入按讚狀態:", error);
      }
    };

    fetchLikeStatuses();
  }, [post]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      setError("請先登入");
      setTimeout(() => router.push("/login"), 1000);
      setIsSubmitting(false);
      return;
    }

    let user;
    try {
      user = JSON.parse(storedUser);
    } catch (err) {
      console.error("解析 localStorage user 失敗:", err);
      setError("用戶數據無效，請重新登入");
      setTimeout(() => router.push("/login"), 1000);
      setIsSubmitting(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("未找到認證憑證，請重新登入");
      setTimeout(() => router.push("/login"), 1000);
      setIsSubmitting(false);
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
        mutate((currentPost) => {
          if (!currentPost) return currentPost;
          return {
            ...currentPost,
            comments: [...currentPost.comments, data.comment],
          };
        }, false);
        setLikeStatuses((prev) => ({
          ...prev,
          [`comment-${data.comment.id}`]: false,
        }));
        setSuccessMessage("留言已提交！");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(data.message || "提交留言失敗");
      }
    } catch (error) {
      console.error("錯誤提交留言:", error);
      setError("提交留言時發生錯誤，請再試一次。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="w-full max-w-2xl p-6">
          <p className="text-red-500 text-center">{error}</p>
          <Button
            onClick={() => router.push(`/boards/${post?.board?.name || ""}`)}
            className="w-full mt-4"
            variant="secondary"
          >
            返回貼文
          </Button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        載入中...
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb className="w-full">
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={`/boards/${post.board?.name || ""}`}>
                    {post.board?.name || "未知看板"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{post.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Dialog>
              <DialogTrigger className="cursor-pointer" asChild>
                <Button>
                  <MessageSquarePlus />
                  新增留言
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>新增留言</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCommentSubmit} className="grid gap-4">
                  <Textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="撰寫您的留言..."
                    className="w-full p-2 border rounded resize-none"
                    required
                    disabled={isSubmitting}
                  />
                  {error && <p className="text-red-500 mt-2">{error}</p>}
                  {successMessage && (
                    <p className="text-green-500 mt-2">{successMessage}</p>
                  )}
                  <Button
                    className="cursor-pointer"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" /> 提交中
                      </>
                    ) : (
                      <>
                        <SendHorizontal /> 提交留言
                      </>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>
        <Separator />
      </div>
      <main className="flex flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => router.push(`/user-profile/${post.authorId}`)}
            >
              {post.author.nickname || post.author.username}
            </Badge>
            <CardDescription>
              {new Date(post.createdAt).toLocaleString()}
            </CardDescription>
            <CardTitle className="text-lg">{post.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{post.content}</p>
          </CardContent>
          <CardFooter className="flex gap-2">
            <LikeButton
              itemId={post.id}
              itemType="post"
              initialLikeCount={post.likeCount}
              initialLiked={likeStatuses[`post-${post.id}`] || false}
            />
            <Button variant="ghost" className="pointer-events-none">
              <Eye />
              {post.view}
            </Button>
          </CardFooter>
        </Card>
        <CommentList
          postId={parseInt(postId)}
          comments={post.comments}
          likeStatuses={likeStatuses}
        />
      </main>
    </>
  );
}
