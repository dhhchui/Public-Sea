import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwtUtils";

// 配置選項：required 表示是否必須提供 token
export function authMiddleware({ required = true } = {}) {
  return (handler) => async (request, context) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (required) {
        return NextResponse.json(
          { message: "Missing or invalid token" },
          { status: 401 }
        );
      }
      return handler(request, { ...context, userId: null });
    }

    const token = authHeader.replace("Bearer ", "");
    try {
      const { decoded, shouldRefresh, newToken } = verifyToken(token);
      const userId = decoded.userId;

      const response = await handler(request, { ...context, userId });

      // 如果需要重置 token，將新 token 添加到響應頭
      if (shouldRefresh && newToken) {
        response.headers.set("X-New-Token", newToken);
      }

      return response;
    } catch (error) {
      return NextResponse.json(
        { message: error.message || "Unauthorized" },
        { status: 401 }
      );
    }
  };
}
