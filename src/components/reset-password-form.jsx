'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordForm({ onClose }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // 新增 email 狀態
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const validatePassword = (password) => {
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).+$/;
    if (!passwordStrengthRegex.test(password)) {
      return '密碼必須至少包含一個大寫字母、一個小寫字母和一個特殊符號。';
    }
    if (password.length < 8 || password.length > 24) {
      return '密碼長度必須在 8 到 24 個字符之間。';
    }
    if (/\s/.test(password)) {
      return '密碼不能包含空格。';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 驗證所有必填字段
    if (!username || !email || !password || !confirmPassword) {
      setError('所有欄位都是必填的。');
      return;
    }

    // 驗證 email 格式（簡單檢查）
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('請輸入有效的電子郵件地址。');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼並不相同。');
      return;
    }

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }), // 傳送 email
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          if (onClose) onClose();
          router.push('/login');
        }, 3000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('發生錯誤，請稍後再試。');
    }
  };

  return (
    <div className='w-full'>
      <h2 className='text-2xl font-bold mb-4 text-center'>重設密碼</h2>
      {error && <p className='text-red-500 mb-4 text-center'>{error}</p>}
      {success && <p className='text-green-500 mb-4 text-center'>{success}</p>}
      <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
        <div className='grid gap-3'>
          <Label htmlFor='username'>用戶名</Label>
          <Input
            type='text'
            id='username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className='w-full p-2 border rounded'
          />
        </div>
        <div className='grid gap-3'>
          <Label htmlFor='email'>電子郵件</Label>
          <Input
            type='email'
            id='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className='w-full p-2 border rounded'
            placeholder='example@example.com'
          />
        </div>
        <div className='grid gap-3'>
          <Label htmlFor='password'>新密碼</Label>
          <Input
            type='password'
            id='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className='w-full p-2 border rounded'
            placeholder='8-24個字符，需包含大寫、小寫字母和特殊符號'
          />
        </div>
        <div className='grid gap-3'>
          <Label htmlFor='confirmPassword'>確認新密碼</Label>
          <Input
            type='password'
            id='confirmPassword'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className='w-full p-2 border rounded'
            placeholder='再次輸入密碼以確認'
          />
        </div>
        <Button
          type='submit'
          className='w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600'
        >
          重設密碼
        </Button>
      </form>
      <div className='mt-4 text-center text-sm'>
        <a
          onClick={onClose}
          className='underline underline-offset-4 cursor-pointer text-blue-600'
        >
          返回登入
        </a>
      </div>
    </div>
  );
}