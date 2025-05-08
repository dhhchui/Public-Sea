"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { useRouter } from "next/navigation";

export default function FollowUser({ onSuccess, onFollow }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSearchResult(null);

    if (!searchQuery) {
      setError("Please enter a nickname or email to search.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login to search users.");
        return;
      }

      const res = await fetch("/api/search-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();
      if (res.ok) {
        setSearchResult(data.user);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setError("An error occurred while searching. Please try again.");
    }
  };

  const handleFollow = async (targetUserId) => {
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Successfully followed the user!");
        setSearchResult(null);
        setSearchQuery("");
        if (onFollow) {
          onFollow();
        }
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("Error following user:", error);
      setError("An error occurred while following the user. Please try again.");
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Follow a User</h2>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      {success && <p className="text-green-500 mb-4 text-center">{success}</p>}
      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          placeholder="Search by nickname or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          type="submit"
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Search
        </button>
      </form>
      {searchResult && (
        <div className="flex items-center justify-between p-2 border rounded">
          <span
            onClick={() => router.push(`/user-profile/${searchResult.id}`)}
            className="cursor-pointer text-blue-500 hover:underline"
          >
            {searchResult.nickname}
          </span>
          <button
            onClick={() => handleFollow(searchResult.id)}
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Follow
          </button>
        </div>
      )}
    </div>
  );
}

FollowUser.propTypes = {
  onSuccess: PropTypes.func,
  onFollow: PropTypes.func,
};

FollowUser.defaultProps = {
  onSuccess: () => {},
  onFollow: () => {},
};
