'use client';

const PREDEFINED_HOBBIES = [
  '閱讀',
  '跑步',
  '烹飪',
  '音樂',
  '旅行',
  '攝影',
  '遊戲',
  '健身',
  '畫畫',
  '電影',
];

export default function ProfileEditForm({
  formData,
  handleInputChange,
  handleHobbyChange,
  handleEditSubmit,
  error,
  successMessage,
  setIsEditing,
}) {
  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">編輯個人資料</h2>
      <form onSubmit={handleEditSubmit} className="space-y-4">
        <div>
          <label className="text-lg font-medium text-gray-700">暱稱</label>
          <input
            name="nickname"
            value={formData.nickname}
            onChange={handleInputChange}
            required
            className="w-full p-2 mt-1 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-lg font-medium text-gray-700">簡介</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={3}
            className="w-full p-2 mt-1 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-lg font-medium text-gray-700">興趣（請選擇）</label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {PREDEFINED_HOBBIES.map((hobby) => (
              <div key={hobby} className="flex items-center">
                <input
                  type="checkbox"
                  id={`hobby-${hobby}`}
                  value={hobby}
                  checked={formData.hobbies.includes(hobby)}
                  onChange={handleHobbyChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`hobby-${hobby}`}
                  className="ml-2 text-gray-700"
                >
                  {hobby}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="text-lg font-medium text-gray-700">新密碼（可選）</label>
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full p-2 mt-1 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-lg font-medium text-gray-700">確認新密碼</label>
          <input
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full p-2 mt-1 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-red-500">{error}</p>}
        {successMessage && <p className="text-green-500">{successMessage}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="w-full p-2 border-gray-300 text-gray-700 rounded hover:bg-gray-100"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}