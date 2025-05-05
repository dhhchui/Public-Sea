import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { CommentSection } from "@/components/comment-section";

export default async function PostPage({ params, searchParams }) {
  const { board, postId } = params;
  const currentPage = parseInt(searchParams.page) || 1;
  const pageSize = 5;

  const post = await prisma.post.findUnique({
    where: { id: parseInt(postId), board },
    include: {
      author: true,
      comments: {
        include: { author: true },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      },
    },
  });

  const totalComments = await prisma.comment.count({
    where: { postId: parseInt(postId) },
  });

  if (!post) notFound();

  return (
    <div className="h-full overflow-y-auto">
      <Card className="mb-2">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{post.title}</CardTitle>
          <p className="text-sm text-gray-500">
            作者: {post.author?.username || "匿名"} • 瀏覽: {post.view} • 讚: {post.likeCount} • 時間: {post.createdAt.toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none mb-2">{post.content}</div>
        </CardContent>
      </Card>

      <CommentSection
        post={post}
        totalComments={totalComments}
        board={board}
        postId={postId}
      />
    </div>
  );
}