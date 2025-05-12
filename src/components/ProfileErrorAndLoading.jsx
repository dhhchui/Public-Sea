import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfileErrorAndLoading({ error, user, router, children }) {
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>錯誤</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">
              {error}
              {error.includes("Invalid token") && (
                <span>
                  {" "}
                  請
                  <a href="/login" className="text-blue-500 underline">
                    重新登入
                  </a>
                  。
                </span>
              )}
            </p>
            <Button
              onClick={() => router.push("/")}
              className="w-full mt-4 bg-gray-500 hover:bg-gray-600"
            >
              返回首頁
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {children}
      <Button
        onClick={() => router.push("/")}
        className="w-full max-w-4xl mx-auto mt-8 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
      >
        返回首頁
      </Button>
    </div>
  );
}