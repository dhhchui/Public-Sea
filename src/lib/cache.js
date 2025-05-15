// lib/cache.js

// 全局快取物件，用於儲存看板數據
const boardsCache = {
  data: null,
  promise: null,
};

// 獲取看板貼文快取鍵
export function getPostListCacheKey(boardId, userId) {
  return `posts:board:${boardId || "all"}:user:${
    userId || "anonymous-" + Date.now()
  }`;
}

// 自訂 fetch 函數，避免重複請求
export const fetchBoardsData = async () => {
  if (boardsCache.data) {
    console.log("Using cached boards data");
    return boardsCache.data;
  }

  if (boardsCache.promise) {
    console.log("Using ongoing boards fetch promise");
    return await boardsCache.promise;
  }

  console.log("Fetching boards data from API");
  boardsCache.promise = fetch("/api/boards", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch boards: ${res.status}`);
      }
      const data = await res.json();
      boardsCache.data = data.boards || [];
      boardsCache.promise = null;
      console.log("Boards cached:", boardsCache.data);
      return boardsCache.data;
    })
    .catch((error) => {
      console.error("Error fetching boards:", error.message, error.stack);
      boardsCache.promise = null;
      throw error;
    });

  return await boardsCache.promise;
};

// 提供一個方法來清空快取
export const clearBoardsCache = () => {
  console.log("Clearing boards cache");
  boardsCache.data = null;
  boardsCache.promise = null;
};
