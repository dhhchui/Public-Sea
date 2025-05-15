const fetchWithToken = async (url, options = {}) => {
  const token = localStorage.getItem("token") || "";

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  // 檢查響應頭中的新 token
  const newToken = response.headers.get("X-New-Token");
  if (newToken) {
    localStorage.setItem("token", newToken);
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Unauthorized: Please log in again");
    }
    const errorData = await response.json();
    throw new Error(errorData.message || "Request failed");
  }

  return response.json();
};

export const apiClient = {
  get: (url, options) => fetchWithToken(url, { method: "GET", ...options }),
  post: (url, data, options) =>
    fetchWithToken(url, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    }),
  patch: (url, data, options) =>
    fetchWithToken(url, {
      method: "PATCH",
      body: JSON.stringify(data),
      ...options,
    }),
  delete: (url, options) =>
    fetchWithToken(url, { method: "DELETE", ...options }),
};
