"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown } from "lucide-react";

export default function RatingModal({ ratedUserId, onRatingSubmitted, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [rating, setRating] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkRatingStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("請先登入");
          return;
        }

        const res = await fetch(`/api/rating/status?ratedUserId=${ratedUserId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get("content-type");
        const responseText = await res.text();
        console.log("Response Content-Type for /api/rating/status:", contentType);

        try {
          const data = JSON.parse(responseText);
          if (res.ok) {
            setHasRated(data.hasRated);
            setRating(data.rating);
            setError("");
          } else {
            setError(data.message || "無法檢查評分狀態");
          }
        } catch (err) {
          console.error("Unexpected response format:", responseText);
          setError("伺服器響應格式錯誤");
        }
      } catch (err) {
        console.error("Error checking rating status:", err);
        setError("檢查評分狀態時發生錯誤");
      }
    };

    if (ratedUserId) {
      checkRatingStatus();
    }
  }, [ratedUserId]);

  const handleRating = async (ratingValue) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("請先登入");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/rating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ratedUserId,
          rating: ratingValue,
        }),
      });

      const contentType = res.headers.get("content-type");
      const responseText = await res.text();
      console.log("Response Content-Type for /api/rating:", contentType);

      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          setHasRated(true);
          setRating(ratingValue);
          setSuccessMessage(`評分提交成功！新評分總和：${data.newRating}`);
          setTimeout(() => setSuccessMessage(""), 3000);

          // 觸發紅旗檢查
          await fetch("/api/check-redflag", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ targetUserId: ratedUserId }),
          });

          // 通知 UserProfile 更新
          if (onRatingSubmitted) {
            onRatingSubmitted();
          }
          setIsOpen(false); // 提交後關閉模態框
        } else {
          setError(data.message || "無法提交評分");
        }
      } catch (err) {
        console.error("Unexpected response format:", responseText);
        setError("伺服器響應格式錯誤");
      }
    } catch (err) {
      console.error("Error submitting rating:", err);
      setError("提交評分時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-md"
        disabled={disabled || loading}
      >
        評分
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">評分用戶</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              選擇「讚賞」以提升用戶評分，或「負評」以降低評分。
            </p>
            {error && <p className="text-red-500 text-sm bg-red-100 p-2 rounded">{error}</p>}
            {successMessage && (
              <p className="text-green-500 text-sm bg-green-100 p-2 rounded">{successMessage}</p>
            )}
            {hasRated ? (
              <p className="text-gray-600 text-center">
                你已給此用戶評分：{rating === 1 ? "讚賞 (+1)" : "負評 (-1)"}
              </p>
            ) : (
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleRating(1)}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
                >
                  <ThumbsUp className="h-5 w-5" />
                  讚賞
                </Button>
                <Button
                  onClick={() => handleRating(-1)}
                  disabled={loading}
                  className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
                >
                  <ThumbsDown className="h-5 w-5" />
                  負評
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}