'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function CreatePost({ children }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [boardId, setBoardId] = useState('');
  const [boards, setBoards] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch('/api/boards', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setBoards(data.boards);

          // 設置預設看板（選擇第一個看板）
          if (data.boards.length > 0) {
            setBoardId(data.boards[0].id.toString());
          }
        } else {
          const errorData = await res.json();
          setError(errorData.message || '無法載入看板');
        }
      } catch (error) {
        console.error('Error fetching boards:', error);
        setError('載入看板時發生錯誤，請稍後再試');
      }
    };

    fetchBoards();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!title || !content || !boardId) {
      setError('請填寫所有欄位');
      return;
    }

    try {
      const res = await fetch('/api/create-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, boardId: parseInt(boardId) }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('新增貼文成功！即將跳轉...');
        setTimeout(() => {
          router.push('/post-list');
        }, 1000);
        setTitle('');
        setContent('');
        setBoardId(boards[0]?.id.toString() || '');
      } else {
        setError(data.message || '新增貼文失敗，請重試');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('新增貼文時發生錯誤，請重試');
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger className='cursor-pointer' asChild>
          {/* <Button>
            <FilePlus />
            新增貼文
          </Button> */}
          {children}
        </DialogTrigger>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>新增貼文</DialogTitle>
            {/* <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription> */}
          </DialogHeader>
          {/* <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='name' className='text-right'>
                Name
              </Label>
              <Input id='name' value='Pedro Duarte' className='col-span-3' />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='username' className='text-right'>
                Username
              </Label>
              <Input id='username' value='@peduarte' className='col-span-3' />
            </div>
          </div> */}
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <div className='grid gap-2'>
              <Label>標題</Label>
              <Input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='w-full p-2 border rounded'
                placeholder='輸入貼文標題'
              />
            </div>
            <div className='grid gap-2'>
              <Label>內容</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className='w-full p-2 border rounded resize-none'
                placeholder='輸入貼文內容'
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label>看板</Label>
              <Select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='選擇看板' />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className='text-red-500 mb-4 text-center'>{error}</p>}
            {success && (
              <p className='text-green-500 mb-4 text-center'>{success}</p>
            )}
            <Button className='cursor-pointer' type='submit'>
              新增貼文
            </Button>
          </form>
          {/* <DialogFooter>
            <Button type='submit'>Save changes</Button>
          </DialogFooter> */}
        </DialogContent>
      </Dialog>
      {/* <div className='flex justify-center items-center min-h-screen bg-gray-100'>
        <div className='bg-white p-6 rounded shadow-md w-full max-w-md'>
          <h2 className='text-2xl font-bold mb-4 text-center'>新增貼文</h2>
          {error && <p className='text-red-500 mb-4 text-center'>{error}</p>}
          {success && (
            <p className='text-green-500 mb-4 text-center'>{success}</p>
          )}
          <form onSubmit={handleSubmit}>
            <div className='mb-4'>
              <label className='block text-gray-700'>標題</label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='w-full p-2 border rounded'
                placeholder='輸入貼文標題'
              />
            </div>
            <div className='mb-4'>
              <label className='block text-gray-700'>內容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className='w-full p-2 border rounded'
                rows='5'
                placeholder='輸入貼文內容'
              />
            </div>
            <div className='mb-4'>
              <label className='block text-gray-700'>看板</label>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className='w-full p-2 border rounded'
              >
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type='submit'
              className='w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            >
              新增貼文
            </button>
          </form>
          <button
            onClick={() => router.push('/')}
            className='w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600'
          >
            返回儀表板
          </button>
        </div>
      </div> */}
    </>
  );
}
