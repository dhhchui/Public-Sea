'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Search, UserPlus, Heart } from 'lucide-react';
import debounce from 'lodash/debounce';

export default function SearchBar({ onToggle }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(
    debounce(async (query) => {
      if (!query) {
        setSearchResults({ users: [], posts: [] });
        setError('請輸入搜尋關鍵字');
        return;
      }

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ query }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.log('Response status:', res.status);
          console.log('Response text:', errorData.message);
          if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/login');
            return;
          }
          setError(errorData.message || '搜尋失敗');
          setSearchResults({ users: [], posts: [] });
          return;
        }

        const data = await res.json();
        if (data.users.length === 0 && data.posts.length === 0) {
          setError('無匹配的用戶或貼文');
        } else {
          setError('');
        }
        setSearchResults(data);
      } catch (error) {
        console.error('Error during search:', error);
        setError('搜尋時發生錯誤');
        setSearchResults({ users: [], posts: [] });
      }
    }, 500),
    [router]
  );

  const handleViewProfile = (userId) => {
    router.push(`/user-profile/${userId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults({ users: [], posts: [] });
    setError('');
  };

  const handleAddFriend = async (receiverId) => {
    try {
      const res = await fetch('/api/friend-request/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('好友請求已發送！');
      } else {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        alert(data.message || '發送好友請求失敗');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('發送好友請求時發生錯誤');
    }
  };

  const handleFollow = async (targetUserId) => {
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('關注成功！');
      } else {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        alert(data.message || '關注失敗');
      }
    } catch (error) {
      console.error('Error following user:', error);
      alert('關注時發生錯誤');
    }
  };

  const handlePostClick = (boardName, postId) => {
    router.push(`/boards/${boardName}/posts/${postId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults({ users: [], posts: [] });
    setError('');
  };

  return (
    <>
      <SidebarMenuButton
        tooltip='搜尋'
        onClick={() => {
          setIsSearchOpen(!isSearchOpen);
          if (onToggle) {
            onToggle(!isSearchOpen);
          }
        }}
      >
        <Search />
        <span>搜尋</span>
      </SidebarMenuButton>
      {isSearchOpen && (
        <div className='p-2 bg-white shadow-lg rounded-md mt-2 w-full max-w-md'>
          <Input
            type='text'
            placeholder='搜尋用戶或貼文...'
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className='mb-2'
          />
          <Button
            onClick={() => handleSearch(searchQuery)}
            className='w-full mb-2'
          >
            搜尋
          </Button>
          {error && <p className='text-red-500 text-sm mb-2'>{error}</p>}
          {(searchResults.users.length > 0 ||
            searchResults.posts.length > 0) && (
            <div className='max-h-60 overflow-y-auto'>
              {searchResults.users.length > 0 && (
                <>
                  <p className='font-semibold text-sm mb-1'>用戶</p>
                  {searchResults.users.map((user) => (
                    <div
                      key={user.id}
                      className='flex justify-between items-center p-2 hover:bg-gray-100 rounded-md w-full'
                    >
                      <span
                        className='cursor-pointer flex-1 truncate'
                        onClick={() => handleViewProfile(user.id)}
                      >
                        {user.nickname || user.username}
                      </span>
                      <div className='flex gap-1'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='border-blue-500 text-blue-500 hover:bg-blue-100 p-1 h-6 w-6'
                          onClick={() => handleAddFriend(user.id)}
                        >
                          <UserPlus className='h-3 w-3' />
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='border-green-500 text-green-500 hover:bg-green-100 p-1 h-6 w-6'
                          onClick={() => handleFollow(user.id)}
                        >
                          <Heart className='h-3 w-3' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {searchResults.posts.length > 0 && (
                <>
                  <p className='font-semibold text-sm mb-1 mt-2'>貼文</p>
                  {searchResults.posts.map((post) => (
                    <div
                      key={post.id}
                      className='p-2 hover:bg-gray-100 rounded-md cursor-pointer w-full'
                      onClick={() => handlePostClick(post.board.name, post.id)}
                    >
                      <div>{post.title}</div>
                      <div className='text-sm text-gray-500'>
                        所屬看板：{post.board.name}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
