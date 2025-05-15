import { getRedisClient } from "@/lib/redisClient";
import { apiClient } from "@/lib/apiClient";

// 獲取封鎖用戶列表（blockedUsers）
export const getBlockedUsers = async (userId) => {
  const response = await apiClient.get(`/api/blocked-users?userId=${userId}`);
  return response.blockedUsers || [];
};

// 獲取封鎖當前用戶的列表（usersWhoBlockedMe）
export const getUsersWhoBlockedMe = async (userId) => {
  const response = await apiClient.get(`/api/blocked-by?userId=${userId}`);
  return response.usersWhoBlockedMe || [];
};

// 獲取合併的封鎖列表（blockedUserIds）
export const getBlockedUserIds = async (userId) => {
  const response = await apiClient.get(`/api/blocked-ids?userId=${userId}`);
  return response.blockedUserIds || [];
};

// 獲取用戶的紅旗狀態（isRedFlagged）
export const getIsRedFlagged = async (userId) => {
  const response = await apiClient.get(`/api/user-redflagged?userId=${userId}`);
  return response.isRedFlagged || false;
};

// 失效快取（當封鎖或紅旗狀態更新時）
export const invalidateBlockedUserCache = async (userId) => {
  await apiClient.post(`/api/invalidate-blocked-cache`, { userId });
};

// 失效紅旗快取
export const invalidateRedFlaggedCache = async (userId) => {
  await apiClient.post(`/api/invalidate-redflagged-cache`, { userId });
};

// 獲取看板數據（fetchBoardsData）
export const fetchBoardsData = async () => {
  const redis = getRedisClient();
  const cacheKey = "boards:all";
  console.log("Checking cache for boards:", cacheKey);

  let cachedBoards;
  try {
    const response = await redis.get(cacheKey);
    if (typeof response === "string" && response.startsWith("<!DOCTYPE")) {
      throw new Error("Received HTML response instead of JSON");
    }
    cachedBoards = response;
    console.log("Cached boards:", cachedBoards);
  } catch (redisError) {
    console.error("Redis error:", redisError.message);
    cachedBoards = null;
  }

  if (cachedBoards && cachedBoards.length > 0) {
    console.log("Returning cached boards");
    return cachedBoards;
  }

  console.log("Cache miss or empty cache, fetching boards from API");
  try {
    const data = await apiClient.get("/api/boards");
    const boards = data.boards || [];

    if (!boards || boards.length === 0) {
      console.log("No boards found");
      throw new Error("No boards found");
    }

    try {
      await redis.set(cacheKey, boards, { ex: 3600 }); // TTL 設為 1 小時
      console.log("Boards cached successfully");
    } catch (redisSetError) {
      console.error("Error caching boards to Redis:", redisSetError.message);
    }

    console.log("Boards retrieved:", boards);
    return boards;
  } catch (error) {
    console.error("Error fetching boards:", error);
    throw new Error("Failed to fetch boards: " + error.message);
  }
};
