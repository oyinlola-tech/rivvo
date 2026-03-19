import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useChat } from '../contexts/ChatContext';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { EmptyChatState } from '../components/chat/EmptyChatState';
import { MobileNav } from '../components/MobileNav';

export function ChatsPage() {
  const { chatId } = useParams();
  const { setActiveChat, activeChat } = useChat();
  const [showChatList, setShowChatList] = useState(true);

  useEffect(() => {
    if (chatId) {
      setActiveChat(chatId);
      setShowChatList(false);
    } else {
      setActiveChat(null);
      setShowChatList(true);
    }
  }, [chatId, setActiveChat]);

  return (
    <div className="flex h-full">
      {/* Chat List */}
      <div className={`${showChatList ? 'flex' : 'hidden md:flex'} w-full md:w-96 border-r border-border flex-col`}>
        <ChatList />
      </div>

      {/* Chat Window */}
      <div className={`${!showChatList || activeChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {activeChat ? (
          <ChatWindow onBack={() => setShowChatList(true)} />
        ) : (
          <EmptyChatState />
        )}
      </div>

      <MobileNav />
    </div>
  );
}
