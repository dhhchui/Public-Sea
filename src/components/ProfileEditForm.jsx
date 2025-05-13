import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ProfileEditForm({
  formData,
  handleInputChange,
  handleEditSubmit,
  error,
  successMessage,
  setIsEditing,
}) {
  return (
    <Card className="mb-8 shadow-lg rounded-xl border border-gray-200">
      <CardHeader className="bg-white rounded-t-xl p-6">
        <CardTitle className="text-3xl font-bold text-gray-800">編輯個人資料</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6 bg-gray-50 rounded-b-xl">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nickname" className="text-lg font-medium text-gray-700">
              暱稱
            </Label>
            <Input
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              required
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="bio" className="text-lg font-medium text-gray-700">
              簡介
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="hobbies" className="text-lg font-medium text-gray-700">
              興趣（用逗號分隔，例如：閱讀, 跑步, 烹飪）
            </Label>
            <Input
              id="hobbies"
              name="hobbies"
              value={formData.hobbies}
              onChange={handleInputChange}
              placeholder="閱讀, 跑步, 烹飪"
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-lg font-medium text-gray-700">
              新密碼（可選）
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="text-lg font-medium text-gray-700">
              確認新密碼
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="mt-1 p-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          {successMessage && <p className="text-green-500">{successMessage}</p>}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md"
            >
              保存
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 py-2 px-4 rounded-md"
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}