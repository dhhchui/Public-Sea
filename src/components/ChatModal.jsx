'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConversationList from '@/components/ConversationList';
import MessageInput from '@/components/MessageInput';
import Pusher from 'pusher-js';
import useSWR from 'swr';
import { FixedSizeList } from 'react-window';
import { Check, Loader2 } from 'lucide-react';

// Custom fetcher for useSWR
const fetcher = async (url, token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'GET',
    headers,
  });

  const contentType = res.headers.get('content-type');
  const responseText = await res.text();
  console.log(`Response Content-Type for ${url}:`, contentType);
  console.log(`Response body for ${url}:`, responseText);

  try {
    const data = JSON.parse(responseText);
    if (!res.ok) {
      throw new Error(data.message || `無法載入數據 from ${url}`);
    }
    return data;
  } catch (err) {
    console.error(`Unexpected response format for ${url}:`, responseText);
    throw new Error('伺服器響應格式錯誤');
  }
};

// Format message data with fallback for invalid dates
const formatMessage = (message, currentUserId) => {
  const isOwnMessage = message.senderId === currentUserId;
  let formattedTime = 'Invalid Date'; // Default fallback
  try {
    const date = new Date(message.createdAt);
    if (!isNaN(date.getTime())) {
      formattedTime = date.toLocaleString('zh-HK', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      console.warn('Invalid createdAt value:', message.createdAt);
    }
  } catch (err) {
    console.error('Error parsing createdAt:', message.createdAt, err);
  }
  return {
    ...message,
    isOwnMessage,
    formattedTime,
    status: message.status || 'sent',
    tempKey: message.tempKey, // Preserve tempKey if provided
  };
};

// ConversationPane component (unchanged)
const ConversationPane = React.memo(
  ({
    selectedConversation,
    userId,
    messages,
    messagesEndRef,
    onSendMessage,
  }) => {
    const MessageRow = React.memo(({ index, style }) => {
      const message = messages[index];
      return (
        <div style={style}>
          <div
            className={`mb-3 flex ${
              message.isOwnMessage ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg shadow-sm relative ${
                message.isOwnMessage
                  ? 'bg-slate-100 text-slate-800 message-bubble-right'
                  : 'bg-white text-slate-800 message-bubble-left'
              }`}
            >
              <p>{message.content}</p>
              <div className='flex items-center justify-end mt-1'>
                <p className='text-xs text-slate-500 mr-1'>
                  {message.formattedTime}
                </p>
                {message.isOwnMessage && (
                  <span className='text-xs text-slate-500'>
                    {message.status === 'sending' && (
                      <Loader2 className='h-3 w-3 animate-spin' />
                    )}
                    {message.status === 'sent' && (
                      <Check className='h-3 w-3 text-green-500' />
                    )}
                    {message.status === 'failed' && (
                      <span className='text-red-500'>!</span>
                    )}
                  </span>
                )}
              </div>
              <div
                className={`absolute top-0 w-4 h-4 ${
                  message.isOwnMessage
                    ? 'right-[-8px] bg-slate-100 message-tail-right'
                    : 'left-[-8px] bg-white message-tail-left'
                }`}
              />
            </div>
          </div>
        </div>
      );
    });

    return (
      <div className='w-2/3 flex flex-col h-full'>
        <span id='dialog-description' className='sr-only'>
          這是一個用於私聊的對話視窗，顯示對話列表和訊息內容。
        </span>
        {selectedConversation ? (
          <>
            <DialogHeader className='p-4 bg-blue-500 border-b border-blue-600 flex items-center text-white'>
              <DialogTitle className='text-lg font-semibold'>
                與{' '}
                {selectedConversation.user1Id === userId
                  ? selectedConversation.user2.nickname
                  : selectedConversation.user1.nickname}
              </DialogTitle>
            </DialogHeader>

            <div
              className='flex-1 p-4 bg-gray-100 overflow-y-auto'
              style={{ height: 'calc(90vh - 200px)' }}
            >
              {messages.length === 0 ? (
                <div className='flex items-center justify-center h-full'>
                  <p className='text-slate-500'>開始聊天吧！</p>
                </div>
              ) : (
                <FixedSizeList
                  height={400}
                  width='100%'
                  itemCount={messages.length}
                  itemSize={100}
                  className='overflow-hidden'
                >
                  {MessageRow}
                </FixedSizeList>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className='p-4 bg-gray-200 border-t border-gray-300'>
              <MessageInput onSendMessage={onSendMessage} />
            </div>
          </>
        ) : (
          <div className='flex-1 flex items-center justify-center bg-gray-100'>
            <p className='text-slate-500'>選擇一個對話開始聊天</p>
          </div>
        )}
      </div>
    );
  }
);

export default function ChatModal({ isOpen, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newConversationUser, setNewConversationUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  const [pusher, setPusher] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      setUserId(userData ? JSON.parse(userData).userId : null);
      setToken(localStorage.getItem('token'));
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !userId) return;

    if (!userId) {
      setError('無法獲取用戶資訊，請重新登入');
      onClose();
      return;
    }
  }, [isOpen, onClose, userId]);

  useEffect(() => {
    if (!isOpen) return;

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      encrypted: true,
    });
    setPusher(pusherClient);

    return () => {
      pusherClient.disconnect();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!pusher || !selectedConversation) return;

    const channel = pusher.subscribe(`conversation-${selectedConversation.id}`);
    channel.bind('new-message', (data) => {
      const startTime = performance.now();
      console.log('Pusher new-message data:', data); // Log raw data
      const formattedData = formatMessage(data, userId);

      setMessages((prev) => {
        if (formattedData.tempKey) {
          const matchingMessage = prev.find(
            (msg) => msg.tempKey === formattedData.tempKey
          );
          if (matchingMessage) {
            return prev.map((msg) =>
              msg.tempKey === formattedData.tempKey
                ? { ...formattedData, status: 'sent', tempKey: undefined }
                : msg
            );
          }
        }
        return [...prev, formattedData];
      });

      const endTime = performance.now();
      console.log(
        `Frontend message processing time: ${(endTime - startTime).toFixed(
          2
        )}ms`
      );
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [pusher, selectedConversation, userId]);

  const { data: conversationsData, error: conversationsError } = useSWR(
    userId ? ['/api/conversations', token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      dedupingInterval: 86400000,
      onError: (err) => {
        setError(err.message || '載入對話列表時發生錯誤');
        onClose();
      },
    }
  );

  useEffect(() => {
    if (conversationsData) {
      setConversations(conversationsData.conversations || []);
      setError('');
    }
  }, [conversationsData]);

  const {
    data: messagesData,
    error: messagesError,
    mutate,
  } = useSWR(
    selectedConversation
      ? [`/api/conversation/${selectedConversation.id}`, token]
      : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      onError: (err) => {
        setError(err.message || '載入訊息時發生錯誤');
      },
    }
  );

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    if (messagesData) {
      console.log('Messages data:', messagesData); // Log to check createdAt
      const formattedMessages =
        messagesData.conversation?.messages.map((message) =>
          formatMessage(message, userId)
        ) || [];
      setMessages(formattedMessages);
      setError('');
    }
  }, [messagesData, selectedConversation, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearchUsers = async () => {
    if (!newConversationUser.trim()) {
      setError('請輸入電子郵件或暱稱');
      setSearchResults([]);
      return;
    }

    try {
      if (!token) {
        setError('請先登入');
        onClose();
        return;
      }

      console.log('Sending search request:', {
        emailOrNickname: newConversationUser,
      });

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emailOrNickname: newConversationUser }),
      });

      const contentType = res.headers.get('content-type');
      const responseText = await res.text();
      console.log(
        'Response Content-Type for /api/conversations (POST):',
        contentType
      );
      console.log('Response body for /api/conversations (POST):', responseText);

      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          setSearchResults(data.users || []);
          setError('');
        } else {
          setError(data.message || '無法找到用戶');
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Unexpected response format:', responseText);
        setError('伺服器響應格式錯誤');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setError('搜索用戶時發生錯誤：' + err.message);
      setSearchResults([]);
    }
  };

  const handleStartNewConversation = async (targetUserId) => {
    try {
      if (!token) {
        setError('請先登入');
        onClose();
        return;
      }

      console.log('Sending new conversation request:', { targetUserId });

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      const contentType = res.headers.get('content-type');
      const responseText = await res.text();
      console.log(
        'Response Content-Type for /api/conversations (POST):',
        contentType
      );
      console.log('Response body for /api/conversations (POST):', responseText);

      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          const newConversation = { ...data.conversation, messages: [] };
          setConversations((prev) => {
            const exists = prev.find((conv) => conv.id === newConversation.id);
            if (exists) {
              return prev;
            }
            return [newConversation, ...prev];
          });
          setSelectedConversation(newConversation);
          setNewConversationUser('');
          setSearchResults([]);
          setMessages([]);
          setError('');
        } else {
          setError(data.message || '無法新增對話');
        }
      } catch (err) {
        console.error('Unexpected response format:', responseText);
        setError('伺服器響應格式錯誤');
      }
    } catch (err) {
      console.error('Error starting new conversation:', err);
      setError('新增對話時發生錯誤：' + err.message);
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedConversation || !content) return;

    const tempKey = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const createdAt = new Date().toISOString(); // Ensure valid ISO string
    const optimisticMessage = {
      id: tempKey,
      content,
      senderId: userId,
      createdAt,
      isOwnMessage: true,
      formattedTime: new Date(createdAt).toLocaleString('zh-HK', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'sending',
      tempKey,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      if (!token) {
        setError('請先登入');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.tempKey === tempKey ? { ...msg, status: 'failed' } : msg
          )
        );
        return;
      }

      const receiverId =
        selectedConversation.user1Id === userId
          ? selectedConversation.user2Id
          : selectedConversation.user1Id;

      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId,
          content,
          tempKey,
          createdAt, // Send createdAt to server
        }),
      });

      const contentType = res.headers.get('content-type');
      const responseText = await res.text();
      console.log('Response Content-Type for /api/send-message:', contentType);
      console.log('Response body for /api/send-message:', responseText);

      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          const formattedData = formatMessage(data.message, userId);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.tempKey === tempKey
                ? { ...formattedData, status: 'sent', tempKey: undefined }
                : msg
            )
          );
          setError('');
        } else {
          setError(data.message || '無法發送訊息');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.tempKey === tempKey ? { ...msg, status: 'failed' } : msg
            )
          );
        }
      } catch (err) {
        console.error('Unexpected response format:', responseText);
        setError('伺服器響應格式錯誤');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.tempKey === tempKey ? { ...msg, status: 'failed' } : msg
          )
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('發送訊息時發生錯誤：' + err.message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempKey === tempKey ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-5xl h-[90vh] flex p-0 rounded-lg shadow-lg border border-slate-200'>
        <div className='w-1/3 bg-gray-200 border-r border-gray-300 flex flex-col'>
          <DialogHeader className='p-4 bg-blue-500 border-b border-blue-600 flex items-center text-white'>
            <DialogTitle className='text-lg font-semibold'>對話</DialogTitle>
          </DialogHeader>
          <div className='p-4 flex-1 overflow-y-auto'>
            <div className='flex flex-col gap-2 mb-4'>
              <Input
                placeholder='輸入電子郵件或暱稱開始新對話'
                value={newConversationUser}
                onChange={(e) => setNewConversationUser(e.target.value)}
                className='w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-500'
              />
              <Button
                onClick={handleSearchUsers}
                className='bg-slate-600 text-white hover:bg-slate-700 rounded-lg w-full'
              >
                搜尋用戶
              </Button>
            </div>
            {error && <p className='text-red-500 text-sm mb-2'>{error}</p>}
            {searchResults.length > 0 && (
              <div className='mb-4'>
                <p className='text-sm font-semibold text-slate-700 mb-2'>
                  搜索結果
                </p>
                <div className='space-y-2'>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className='p-2 border rounded cursor-pointer hover:bg-gray-100'
                      onClick={() => handleStartNewConversation(user.id)}
                    >
                      <p className='font-medium'>{user.nickname}</p>
                      <p className='text-sm text-slate-500'>{user.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ConversationList
              conversations={conversations}
              onSelectConversation={(conv) => {
                setSelectedConversation(conv);
                setSearchResults([]);
              }}
              selectedConversationId={selectedConversation?.id}
            />
          </div>
        </div>

        <ConversationPane
          selectedConversation={selectedConversation}
          userId={userId}
          messages={messages}
          messagesEndRef={messagesEndRef}
          onSendMessage={handleSendMessage}
        />
      </DialogContent>

      <style jsx>{`
        .message-bubble-right {
          border-top-right-radius: 0;
        }
        .message-bubble-left {
          border-top-left-radius: 0;
        }
        .message-tail-right {
          clip-path: polygon(0 0, 100% 0, 0 100%);
        }
        .message-tail-left {
          clip-path: polygon(0 0, 100% 0, 100% 100%);
        }
      `}</style>
    </Dialog>
  );
}

// 'use client';

// import React, { useState, useEffect, useRef, useMemo } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import ConversationList from '@/components/ConversationList';
// import MessageInput from '@/components/MessageInput';
// import Pusher from 'pusher-js';
// import useSWR from 'swr';
// import { FixedSizeList } from 'react-window';
// import { Check, Loader2 } from 'lucide-react';

// // 自訂 fetcher 函數給 useSWR 使用
// const fetcher = async (url, token) => {
//   const headers = {
//     'Content-Type': 'application/json',
//   };
//   if (token) {
//     headers['Authorization'] = `Bearer ${token}`;
//   }

//   const res = await fetch(url, {
//     method: 'GET',
//     headers,
//   });

//   const contentType = res.headers.get('content-type');
//   const responseText = await res.text();
//   console.log(`Response Content-Type for ${url}:`, contentType);
//   console.log(`Response body for ${url}:`, responseText);

//   try {
//     const data = JSON.parse(responseText);
//     if (!res.ok) {
//       throw new Error(data.message || `無法載入數據 from ${url}`);
//     }
//     return data;
//   } catch (err) {
//     console.error(`Unexpected response format for ${url}:`, responseText);
//     throw new Error('伺服器響應格式錯誤');
//   }
// };

// // 預格式化訊息數據
// const formatMessage = (message, currentUserId) => {
//   const isOwnMessage = message.senderId === currentUserId;
//   const formattedTime = new Date(message.createdAt).toLocaleString('zh-HK', {
//     month: 'numeric',
//     day: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit',
//   });
//   return {
//     ...message,
//     isOwnMessage,
//     formattedTime,
//     status: message.status || 'sent',
//   };
// };

// // 獨立 ConversationPane 組件
// const ConversationPane = React.memo(
//   ({
//     selectedConversation,
//     userId,
//     messages,
//     messagesEndRef,
//     onSendMessage,
//   }) => {
//     const MessageRow = React.memo(({ index, style }) => {
//       const message = messages[index];
//       return (
//         <div style={style}>
//           <div
//             className={`mb-3 flex ${
//               message.isOwnMessage ? 'justify-end' : 'justify-start'
//             }`}
//           >
//             <div
//               className={`max-w-[70%] p-3 rounded-lg shadow-sm relative ${
//                 message.isOwnMessage
//                   ? 'bg-slate-100 text-slate-800 message-bubble-right'
//                   : 'bg-white text-slate-800 message-bubble-left'
//               }`}
//             >
//               <p>{message.content}</p>
//               <div className='flex items-center justify-end mt-1'>
//                 <p className='text-xs text-slate-500 mr-1'>
//                   {message.formattedTime}
//                 </p>
//                 {message.isOwnMessage && (
//                   <span className='text-xs text-slate-500'>
//                     {message.status === 'sending' && (
//                       <Loader2 className='h-3 w-3 animate-spin' />
//                     )}
//                     {message.status === 'sent' && (
//                       <Check className='h-3 w-3 text-green-500' />
//                     )}
//                     {message.status === 'failed' && (
//                       <span className='text-red-500'>!</span>
//                     )}
//                   </span>
//                 )}
//               </div>
//               <div
//                 className={`absolute top-0 w-4 h-4 ${
//                   message.isOwnMessage
//                     ? 'right-[-8px] bg-slate-100 message-tail-right'
//                     : 'left-[-8px] bg-white message-tail-left'
//                 }`}
//               />
//             </div>
//           </div>
//         </div>
//       );
//     });

//     return (
//       <div className='w-2/3 flex flex-col h-full'>
//         <span id='dialog-description' className='sr-only'>
//           這是一個用於私聊的對話視窗，顯示對話列表和訊息內容。
//         </span>
//         {selectedConversation ? (
//           <>
//             <DialogHeader className='p-4 bg-blue-500 border-b border-blue-600 flex items-center text-white'>
//               <DialogTitle className='text-lg font-semibold'>
//                 與{' '}
//                 {selectedConversation.user1Id === userId
//                   ? selectedConversation.user2.nickname
//                   : selectedConversation.user1.nickname}
//               </DialogTitle>
//             </DialogHeader>

//             <div
//               className='flex-1 p-4 bg-gray-100 overflow-y-auto'
//               style={{ height: 'calc(90vh - 200px)' }}
//             >
//               {messages.length === 0 ? (
//                 <div className='flex items-center justify-center h-full'>
//                   <p className='text-slate-500'>開始聊天吧！</p>
//                 </div>
//               ) : (
//                 <FixedSizeList
//                   height={400}
//                   width='100%'
//                   itemCount={messages.length}
//                   itemSize={100}
//                   className='overflow-hidden'
//                 >
//                   {MessageRow}
//                 </FixedSizeList>
//               )}
//               <div ref={messagesEndRef} />
//             </div>

//             <div className='p-4 bg-gray-200 border-t border-gray-300'>
//               <MessageInput onSendMessage={onSendMessage} />
//             </div>
//           </>
//         ) : (
//           <div className='flex-1 flex items-center justify-center bg-gray-100'>
//             <p className='text-slate-500'>選擇一個對話開始聊天</p>
//           </div>
//         )}
//       </div>
//     );
//   }
// );

// export default function ChatModal({ isOpen, onClose }) {
//   const [conversations, setConversations] = useState([]);
//   const [selectedConversation, setSelectedConversation] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [newConversationUser, setNewConversationUser] = useState('');
//   const [searchResults, setSearchResults] = useState([]);
//   const [error, setError] = useState('');
//   const [pusher, setPusher] = useState(null);
//   const [userId, setUserId] = useState(null);
//   const [token, setToken] = useState(null);
//   const messagesEndRef = useRef(null);

//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       const userData = localStorage.getItem('user');
//       setUserId(userData ? JSON.parse(userData).userId : null);
//       setToken(localStorage.getItem('token'));
//     }
//   }, []);

//   useEffect(() => {
//     if (!isOpen || !userId) return;

//     if (!userId) {
//       setError('無法獲取用戶資訊，請重新登入');
//       onClose();
//       return;
//     }
//   }, [isOpen, onClose, userId]);

//   useEffect(() => {
//     if (!isOpen) return;

//     const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
//       cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
//       encrypted: true,
//     });
//     setPusher(pusherClient);

//     return () => {
//       pusherClient.disconnect();
//     };
//   }, [isOpen]);

//   useEffect(() => {
//     if (!pusher || !selectedConversation) return;

//     const channel = pusher.subscribe(`conversation-${selectedConversation.id}`);
//     channel.bind('new-message', (data) => {
//       const startTime = performance.now();
//       const formattedData = formatMessage(data, userId);

//       setMessages((prev) => {
//         // 嘗試根據 tempKey 匹配樂觀更新的訊息
//         const matchingMessage = prev.find(
//           (msg) =>
//             msg.tempKey &&
//             msg.content === formattedData.content &&
//             Math.abs(
//               new Date(msg.createdAt) - new Date(formattedData.createdAt)
//             ) < 1000
//         );

//         if (matchingMessage) {
//           // 更新樂觀訊息的 id 和 status
//           return prev.map((msg) =>
//             msg.tempKey === matchingMessage.tempKey
//               ? { ...formattedData, tempKey: undefined }
//               : msg
//           );
//         }

//         // 如果不是自己的訊息，直接添加
//         return [...prev, formattedData];
//       });

//       const endTime = performance.now();
//       console.log(
//         `Frontend message processing time: ${(endTime - startTime).toFixed(
//           2
//         )}ms`
//       );
//     });

//     return () => {
//       channel.unbind_all();
//       channel.unsubscribe();
//     };
//   }, [pusher, selectedConversation, userId]);

//   const { data: conversationsData, error: conversationsError } = useSWR(
//     userId ? ['/api/conversations', token] : null,
//     ([url, token]) => fetcher(url, token),
//     {
//       revalidateOnFocus: false,
//       dedupingInterval: 86400000,
//       onError: (err) => {
//         setError(err.message || '載入對話列表時發生錯誤');
//         onClose();
//       },
//     }
//   );

//   useEffect(() => {
//     if (conversationsData) {
//       setConversations(conversationsData.conversations || []);
//       setError('');
//     }
//   }, [conversationsData]);

//   const {
//     data: messagesData,
//     error: messagesError,
//     mutate,
//   } = useSWR(
//     selectedConversation
//       ? [`/api/conversation/${selectedConversation.id}`, token]
//       : null,
//     ([url, token]) => fetcher(url, token),
//     {
//       revalidateOnFocus: false,
//       dedupingInterval: 300000,
//       onError: (err) => {
//         setError(err.message || '載入訊息時發生錯誤');
//       },
//     }
//   );

//   useEffect(() => {
//     if (!selectedConversation) {
//       setMessages([]);
//       return;
//     }

//     if (messagesData) {
//       const formattedMessages =
//         messagesData.conversation?.messages.map((message) =>
//           formatMessage(message, userId)
//         ) || [];
//       setMessages(formattedMessages);
//       setError('');
//     }
//   }, [messagesData, selectedConversation, userId]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   const handleSearchUsers = async () => {
//     if (!newConversationUser.trim()) {
//       setError('請輸入電子郵件或暱稱');
//       setSearchResults([]);
//       return;
//     }

//     try {
//       if (!token) {
//         setError('請先登入');
//         onClose();
//         return;
//       }

//       console.log('Sending search request:', {
//         emailOrNickname: newConversationUser,
//       });

//       const res = await fetch('/api/conversations', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ emailOrNickname: newConversationUser }),
//       });

//       const contentType = res.headers.get('content-type');
//       const responseText = await res.text();
//       console.log(
//         'Response Content-Type for /api/conversations (POST):',
//         contentType
//       );
//       console.log('Response body for /api/conversations (POST):', responseText);

//       try {
//         const data = JSON.parse(responseText);
//         if (res.ok) {
//           setSearchResults(data.users || []);
//           setError('');
//         } else {
//           setError(data.message || '無法找到用戶');
//           setSearchResults([]);
//         }
//       } catch (err) {
//         console.error('Unexpected response format:', responseText);
//         setError('伺服器響應格式錯誤');
//         setSearchResults([]);
//         return;
//       }
//     } catch (err) {
//       console.error('Error searching users:', err);
//       setError('搜索用戶時發生錯誤：' + err.message);
//       setSearchResults([]);
//     }
//   };

//   const handleStartNewConversation = async (targetUserId) => {
//     try {
//       if (!token) {
//         setError('請先登入');
//         onClose();
//         return;
//       }

//       console.log('Sending new conversation request:', { targetUserId });

//       const res = await fetch('/api/conversations', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ targetUserId }),
//       });

//       const contentType = res.headers.get('content-type');
//       const responseText = await res.text();
//       console.log(
//         'Response Content-Type for /api/conversations (POST):',
//         contentType
//       );
//       console.log('Response body for /api/conversations (POST):', responseText);

//       try {
//         const data = JSON.parse(responseText);
//         if (res.ok) {
//           const newConversation = { ...data.conversation, messages: [] };
//           setConversations((prev) => {
//             const exists = prev.find((conv) => conv.id === newConversation.id);
//             if (exists) {
//               return prev;
//             }
//             return [newConversation, ...prev];
//           });
//           setSelectedConversation(newConversation);
//           setNewConversationUser('');
//           setSearchResults([]);
//           setMessages([]);
//           setError('');
//         } else {
//           setError(data.message || '無法新增對話');
//         }
//       } catch (err) {
//         console.error('Unexpected response format:', responseText);
//         setError('伺服器響應格式錯誤');
//         return;
//       }
//     } catch (err) {
//       console.error('Error starting new conversation:', err);
//       setError('新增對話時發生錯誤：' + err.message);
//     }
//   };

//   const handleSendMessage = async (content) => {
//     if (!selectedConversation || !content) return;

//     const createdAt = new Date().toISOString();
//     const tempKey = `${createdAt}-${content}`; // 用時間戳和內容生成唯一標識
//     const optimisticMessage = {
//       id: `temp-${Date.now()}`,
//       content,
//       senderId: userId,
//       createdAt,
//       isOwnMessage: true,
//       formattedTime: new Date().toLocaleString('zh-HK', {
//         month: 'numeric',
//         day: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//       }),
//       status: 'sending',
//       tempKey, // 添加 tempKey 用於匹配
//     };

//     // 樂觀更新：立即顯示訊息
//     setMessages((prev) => [...prev, optimisticMessage]);

//     try {
//       if (!token) {
//         setError('請先登入');
//         setMessages((prev) =>
//           prev.map((msg) =>
//             msg.tempKey === tempKey ? { ...msg, status: 'failed' } : msg
//           )
//         );
//         return;
//       }

//       const receiverId =
//         selectedConversation.user1Id === userId
//           ? selectedConversation.user2Id
//           : selectedConversation.user1Id;

//       const res = await fetch('/api/send-message', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           receiverId,
//           content,
//         }),
//       });

//       const contentType = res.headers.get('content-type');
//       const responseText = await res.text();
//       console.log('Response Content-Type for /api/send-message:', contentType);
//       console.log('Response body for /api/send-message:', responseText);

//       try {
//         const data = JSON.parse(responseText);
//         if (res.ok) {
//           setError('');
//         } else {
//           setError(data.message || '無法發送訊息');
//           setMessages((prev) =>
//             prev.map((msg) =>
//               msg.tempKey === tempKey ? { ...msg, status: 'failed' } : msg
//             )
//           );
//         }
//       } catch (err) {
//         console.error('Unexpected response format:', responseText);
//         setError('伺服器響應格式錯誤');
//         setMessages((prev) =>
//           prev.map((msg) =>
//             msg.tempKey === tempKey ? { ...msg, status: 'failed' } : msg
//           )
//         );
//       }
//     } catch (err) {
//       console.error('Error sending message:', err);
//       setError('發送訊息時發生錯誤：' + err.message);
//       setMessages((prev) =>
//         prev.map((msg) =>
//           msg.tempKey === tempKey ? { ...msg, status: 'failed' } : msg
//         )
//       );
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className='max-w-5xl h-[90vh] flex p-0 rounded-lg shadow-lg border border-slate-200'>
//         <div className='w-1/3 bg-gray-200 border-r border-gray-300 flex flex-col'>
//           <DialogHeader className='p-4 bg-blue-500 border-b border-blue-600 flex items-center text-white'>
//             <DialogTitle className='text-lg font-semibold'>對話</DialogTitle>
//           </DialogHeader>
//           <div className='p-4 flex-1 overflow-y-auto'>
//             <div className='flex flex-col gap-2 mb-4'>
//               <Input
//                 placeholder='輸入電子郵件或暱稱開始新對話'
//                 value={newConversationUser}
//                 onChange={(e) => setNewConversationUser(e.target.value)}
//                 className='w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-500'
//               />
//               <Button
//                 onClick={handleSearchUsers}
//                 className='bg-slate-600 text-white hover:bg-slate-700 rounded-lg w-full'
//               >
//                 搜尋用戶
//               </Button>
//             </div>
//             {error && <p className='text-red-500 text-sm mb-2'>{error}</p>}
//             {searchResults.length > 0 && (
//               <div className='mb-4'>
//                 <p className='text-sm font-semibold text-slate-700 mb-2'>
//                   搜索結果
//                 </p>
//                 <div className='space-y-2'>
//                   {searchResults.map((user) => (
//                     <div
//                       key={user.id}
//                       className='p-2 border rounded cursor-pointer hover:bg-gray-100'
//                       onClick={() => handleStartNewConversation(user.id)}
//                     >
//                       <p className='font-medium'>{user.nickname}</p>
//                       <p className='text-sm text-slate-500'>{user.email}</p>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//             <ConversationList
//               conversations={conversations}
//               onSelectConversation={(conv) => {
//                 setSelectedConversation(conv);
//                 setSearchResults([]);
//               }}
//               selectedConversationId={selectedConversation?.id}
//             />
//           </div>
//         </div>

//         <ConversationPane
//           selectedConversation={selectedConversation}
//           userId={userId}
//           messages={messages}
//           messagesEndRef={messagesEndRef}
//           onSendMessage={handleSendMessage}
//         />
//       </DialogContent>

//       <style jsx>{`
//         .message-bubble-right {
//           border-top-right-radius: 0;
//         }
//         .message-bubble-left {
//           border-top-left-radius: 0;
//         }
//         .message-tail-right {
//           clip-path: polygon(0 0, 100% 0, 0 100%);
//         }
//         .message-tail-left {
//           clip-path: polygon(0 0, 100% 0, 100% 100%);
//         }
//       `}</style>
//     </Dialog>
//   );
// }
