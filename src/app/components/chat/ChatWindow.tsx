import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Phone, Video, MoreVertical, Search, Send, Paperclip, Smile, Mic } from 'lucide-react';
import { VerificationBadge } from '../VerificationBadge';
import { ChatStreak } from '../ChatStreak';
import { formatDistanceToNow } from 'date-fns';

interface ChatWindowProps {
  onBack: () => void;
}

export function ChatWindow({ onBack }: ChatWindowProps) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeChat, messages, sendMessage } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !activeChat) return;

    await sendMessage(activeChat.id, messageText.trim());
    setMessageText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceCall = () => {
    navigate(`/call/voice/${activeChat?.id}`);
  };

  const handleVideoCall = () => {
    navigate(`/call/video/${activeChat?.id}`);
  };

  if (!activeChat) return null;

  const isGroup = activeChat.type === 'group';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button onClick={onBack} className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            {activeChat.avatar ? (
              <img src={activeChat.avatar} alt={activeChat.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-primary">{activeChat.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {!isGroup && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--online-indicator)] border-2 border-card rounded-full"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-foreground">{activeChat.name}</h3>
            {!isGroup && <VerificationBadge role="user" size="sm" />}
            {activeChat.streak && <ChatStreak count={activeChat.streak} size="sm" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {isTyping ? 'typing...' : isGroup ? `${activeChat.participants.length} members` : 'online'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleVoiceCall} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Phone className="w-5 h-5 text-foreground" />
          </button>
          <button onClick={handleVideoCall} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Video className="w-5 h-5 text-foreground" />
          </button>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Search className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={() => isGroup && navigate(`/group/${activeChat.id}/settings`)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--chat-bg)]">
        <div className="space-y-4">
          {messages.map((message) => {
            const isSent = message.senderId === user?.id;
            return (
              <div key={message.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isSent ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isSent
                        ? 'bg-[var(--chat-bubble-sent)] text-white rounded-br-sm'
                        : 'bg-[var(--chat-bubble-received)] text-foreground border border-border rounded-bl-sm'
                    }`}
                  >
                    {!isSent && isGroup && (
                      <p className="text-xs text-primary mb-1">Sender Name</p>
                    )}
                    <p className="break-words">{message.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={`text-xs ${isSent ? 'text-blue-100' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: false })}
                      </span>
                      {isSent && (
                        <svg className={`w-4 h-4 ${message.status === 'read' ? 'text-blue-300' : 'text-blue-100'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          {message.status === 'read' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />}
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <button className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-foreground max-h-32"
              style={{ minHeight: '40px' }}
            />
          </div>
          {messageText.trim() ? (
            <button
              onClick={handleSend}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0">
              <Mic className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
