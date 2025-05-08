"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";

export default function EditProfile({ onSuccess }) {
  const [formData, setFormData] = useState({
    nickname: "",
    password: "",
    confirmPassword: "",
    bio: "",
    hobbies: [],
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hobbyOptions = ["Reading", "Swimming", "Gaming", "Cooking"];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login to edit your profile.");
          return;
        }

        const res = await fetch("/api/current-user", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setFormData({
            nickname: data.user.nickname,
            password: "",
            confirmPassword: "",
            bio: data.user.bio || "",
            hobbies: data.user.hobbies || [],
          });
          setIsLoading(false);
        } else {
          localStorage.removeItem("token");
          setError("Session expired. Please login again.");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("An error occurred while fetching user data.");
        localStorage.removeItem("token");
      }
    };

    fetchUser();
  }, []);

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    if (!hasUpperCase || !hasLowerCase) {
      return "Password must contain at least one uppercase letter and one lowercase letter.";
    }
    return "";
  };

  const validatePasswordsMatch = (password, confirmPassword) => {
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    return "";
  };

  const validateNicknameLength = (nickname) => {
    let totalLength = 0;
    for (const char of nickname) {
      if (/[\u4E00-\u9FFF]/.test(char)) {
        totalLength += 2;
      } else {
        totalLength += 1;
      }
    }
    if (totalLength > 18) {
      return "Nickname exceeds length limit: max 18 letters or 9 Chinese characters.";
    }
    return "";
  };

  const handleHobbyChange = (hobby) => {
    setFormData((prev) => {
      const newHobbies = prev.hobbies.includes(hobby)
        ? prev.hobbies.filter((h) => h !== hobby)
        : [...prev.hobbies, hobby];
      return { ...prev, hobbies: newHobbies };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nicknameError = validateNicknameLength(formData.nickname);
    if (nicknameError) {
      setError(nicknameError);
      return;
    }

    if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      const passwordsMatchError = validatePasswordsMatch(
        formData.password,
        formData.confirmPassword
      );
      if (passwordsMatchError) {
        setError(passwordsMatchError);
        return;
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please login to edit your profile.");
      return;
    }

    console.log("Submitting edit profile data:", formData);
    const res = await fetch("/api/edit-profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      if (onSuccess) {
        onSuccess(); // 調用回調函數
      }
    } else {
      const data = await res.json();
      setError(data.message);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Edit Profile</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <input
          type="text"
          placeholder="Nickname"
          value={formData.nickname}
          onChange={(e) =>
            setFormData({ ...formData, nickname: e.target.value })
          }
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="password"
          placeholder="New Password (leave blank to keep current)"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
          className="w-full p-2 mb-4 border rounded"
        />
        <textarea
          placeholder="Bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="w-full p-2 mb-4 border rounded"
          rows="3"
        />
        <div className="mb-4">
          <p className="font-bold">Hobbies:</p>
          {hobbyOptions.map((hobby) => (
            <label key={hobby} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hobbies.includes(hobby)}
                onChange={() => handleHobbyChange(hobby)}
                className="form-checkbox"
              />
              <span>{hobby}</span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}

EditProfile.propTypes = {
  onSuccess: PropTypes.func, // 定義 onSuccess 為可選的回調函數
};

EditProfile.defaultProps = {
  onSuccess: () => {}, // 默認值為空函數
};
