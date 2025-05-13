// 全局快取物件，用於儲存看板數據
const boardsCache = {
  data: null,
  promise: null,
};

// 自訂 fetch 函數，避免重複請求
export const fetchBoardsData = async () => {
  // 如果快取中已有數據，直接返回
  if (boardsCache.data) {
    console.log("Using cached boards data");
    return boardsCache.data;
  }

  // 如果正在發送請求，返回正在進行的 Promise
  if (boardsCache.promise) {
    console.log("Using ongoing boards fetch promise");
    return await boardsCache.promise;
  }

  // 發送新請求並快取
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
      return boardsCache.data;
    })
    .catch((error) => {
      console.error("Error fetching boards:", error);
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
