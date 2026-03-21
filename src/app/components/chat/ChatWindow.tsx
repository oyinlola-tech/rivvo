import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Phone, Video, MoreVertical, Search, Send, Paperclip, Smile, Mic, Play, Pause, Square, Check, X, MoreHorizontal, Star, Forward } from 'lucide-react';
import { VerificationBadge } from '../VerificationBadge';
import { ChatStreak } from '../ChatStreak';
import { formatDistanceToNow } from 'date-fns';
import type { Message } from '../../contexts/ChatContext';

interface ChatWindowProps {
  onBack: () => void;
}

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const waveformFromId = (id: string, bars = 14) => {
  const seed = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const values: number[] = [];
  let current = seed % 97;
  for (let i = 0; i < bars; i += 1) {
    current = (current * 37 + 23) % 97;
    const height = 6 + (current % 10);
    values.push(height);
  }
  return values;
};

function AudioMessage({ message, isSent }: { message: Message; isSent: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const bars = useMemo(() => waveformFromId(message.id), [message.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => setDuration(audio.duration || 0);
    const handleTime = () => setCurrentTime(audio.currentTime || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [message.mediaUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      // ignore play errors
    }
  };

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const bubbleBase = isSent ? 'bg-[var(--chat-bubble-sent)] text-white' : 'bg-[var(--chat-bubble-received)] text-foreground border border-border';

  return (
    <div className={`px-4 py-2 rounded-2xl ${bubbleBase} ${isSent ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className={`h-9 w-9 rounded-full flex items-center justify-center ${isSent ? 'bg-white/15' : 'bg-muted'}`}
          aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
        >
          {isPlaying ? (
            <Pause className={`w-4 h-4 ${isSent ? 'text-white' : 'text-foreground'}`} />
          ) : (
            <Play className={`w-4 h-4 ${isSent ? 'text-white' : 'text-foreground'}`} />
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-0.5 h-6">
            {bars.map((height, index) => {
              const played = ((index + 1) / bars.length) * 100 <= progress;
              return (
                <span
                  key={`${message.id}-bar-${index}`}
                  className={`w-1 rounded-full ${played ? (isSent ? 'bg-white' : 'bg-primary') : (isSent ? 'bg-white/25' : 'bg-muted')}`}
                  style={{ height }}
                />
              );
            })}
          </div>
          <div className={`mt-1 text-[11px] ${isSent ? 'text-blue-100' : 'text-muted-foreground'}`}>
            {formatDuration(duration || 0)}
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={message.mediaUrl} preload="metadata" />
    </div>
  );
}

const parseMessageContent = (content: string) => {
  if (!content) {
    return { forwarded: false, reply: null as null | { sender: string; preview: string }, body: '' };
  }
  const forwardPrefix = '↪ Forwarded';
  let working = content;
  let forwarded = false;
  if (working.startsWith(forwardPrefix)) {
    forwarded = true;
    working = working.replace(`${forwardPrefix}\n`, '');
  }
  if (working.startsWith('↩ ')) {
    const [firstLine, ...rest] = working.split('\n');
    const meta = firstLine.replace('↩ ', '');
    const [sender, preview] = meta.split(':').map((part) => part?.trim());
    return {
      forwarded,
      reply: {
        sender: sender || 'Contact',
        preview: preview || '',
      },
      body: rest.join('\n'),
    };
  }
  return { forwarded, reply: null, body: working };
};

export function ChatWindow({ onBack }: ChatWindowProps) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [voicePreviewDuration, setVoicePreviewDuration] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardSearch, setForwardSearch] = useState('');
  const [starredOpen, setStarredOpen] = useState(false);
  const [starredScope, setStarredScope] = useState<'chat' | 'all'>('chat');
  const [forwardingProgress, setForwardingProgress] = useState<{ total: number; sent: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeChat, messages, sendMessage, sendVoiceNote, deleteMessage, editMessage, chats, forwardMessage } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeRef = useRef<{ id: string; startX: number; startY: number } | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setActionMessage(null);
    clearSelection();
    setReplyToMessage(null);
    setEditingMessage(null);
  }, [activeChat?.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!activeChat && isRecording) {
      cancelRecording();
    }
  }, [activeChat]);

  useEffect(() => {
    return () => {
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
      }
    };
  }, [voicePreviewUrl]);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    const handleLoaded = () => setVoicePreviewDuration(audio.duration || 0);
    const handleEnded = () => setIsPreviewPlaying(false);
    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [voicePreviewUrl]);

  const handleSend = async () => {
    if (!messageText.trim() || !activeChat) return;

    const trimmed = messageText.trim();
    if (editingMessage) {
      await editMessage(activeChat.id, editingMessage.id, trimmed);
      setEditingMessage(null);
    } else if (replyToMessage) {
      const senderLabel =
        replyToMessage.senderId === user?.id
          ? 'You'
          : activeChat.type === 'group'
            ? 'Member'
            : activeChat.name || 'Contact';
      const preview = replyToMessage.content?.slice(0, 80) || 'Message';
      await sendMessage(activeChat.id, `↩ ${senderLabel}: ${preview}\n${trimmed}`);
      setReplyToMessage(null);
    } else {
      await sendMessage(activeChat.id, trimmed);
    }
    setMessageText('');
  };

  const startRecording = async () => {
    if (!activeChat || isRecording) return;
    try {
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
        setVoicePreviewUrl(null);
        setVoicePreviewBlob(null);
        setVoicePreviewDuration(0);
        setIsPreviewPlaying(false);
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];
      const supportedType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      chunksRef.current = [];
      cancelRecordingRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRecording(false);
        const shouldCancel = cancelRecordingRef.current;
        cancelRecordingRef.current = false;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (!shouldCancel && blob.size > 0) {
          const previewUrl = URL.createObjectURL(blob);
          setVoicePreviewUrl(previewUrl);
          setVoicePreviewBlob(blob);
        }
        setRecordSeconds(0);
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (error) {
      console.error('Microphone permission denied:', error);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  };

  const cancelRecording = () => {
    cancelRecordingRef.current = true;
    stopRecording();
  };

  const sendVoicePreview = async () => {
    if (!voicePreviewBlob || !activeChat) return;
    const extension = voicePreviewBlob.type.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `voice-note-${Date.now()}.${extension}`;
    try {
      await sendVoiceNote(activeChat.id, voicePreviewBlob, fileName);
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
      }
      setVoicePreviewUrl(null);
      setVoicePreviewBlob(null);
      setVoicePreviewDuration(0);
      setIsPreviewPlaying(false);
    } catch (error) {
      console.error('Failed to send voice note:', error);
    }
  };

  const discardVoicePreview = () => {
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
    }
    setVoicePreviewUrl(null);
    setVoicePreviewBlob(null);
    setVoicePreviewDuration(0);
    setIsPreviewPlaying(false);
  };

  const togglePreviewPlayback = async () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
      return;
    }
    try {
      await audio.play();
      setIsPreviewPlaying(true);
    } catch {
      // ignore play errors
    }
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
  const selectionMode = selectedMessages.size > 0;

  const toggleSelection = (messageId: string) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
  };

  const handleReplySelected = () => {
    if (selectedMessages.size !== 1) return;
    const selectedId = Array.from(selectedMessages)[0];
    const message = messages.find((m) => m.id === selectedId) || null;
    if (message) {
      setReplyToMessage(message);
    }
    clearSelection();
  };

  const handleCopySelected = async () => {
    if (selectedMessages.size !== 1) return;
    const selectedId = Array.from(selectedMessages)[0];
    const message = messages.find((m) => m.id === selectedId);
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message.content || '');
    } catch {
      // ignore copy errors
    }
    clearSelection();
  };

  const handleForwardSelected = () => {
    if (selectedMessages.size === 0) return;
    setForwardOpen(true);
  };

  const forwardTargets = chats.filter((chat) =>
    chat.name?.toLowerCase().includes(forwardSearch.toLowerCase())
  );

  const handleForwardToChat = async (targetChatId: string) => {
    if (!activeChat) return;
    const ids = Array.from(selectedMessages);
    setForwardingProgress({ total: ids.length, sent: 0 });
    for (const id of ids) {
      const message = messages.find((m) => m.id === id);
      if (!message) continue;
      await forwardMessage(targetChatId, message);
      setForwardingProgress((prev) =>
        prev ? { total: prev.total, sent: Math.min(prev.sent + 1, prev.total) } : prev
      );
    }
    setForwardOpen(false);
    setForwardSearch('');
    clearSelection();
    setForwardingProgress(null);
  };

  const handleActionForward = () => {
    if (!actionMessage) return;
    setSelectedMessages(new Set([actionMessage.id]));
    setActionMessage(null);
    setForwardOpen(true);
  };

  const handleActionStar = () => {
    if (!actionMessage) return;
    const key = `rivvo_starred_${activeChat?.id || ''}`;
    const stored = JSON.parse(localStorage.getItem(key) || '[]') as string[];
    const set = new Set(stored);
    if (set.has(actionMessage.id)) {
      set.delete(actionMessage.id);
    } else {
      set.add(actionMessage.id);
    }
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
    const globalKey = 'rivvo_starred_global';
    const globalStored = JSON.parse(localStorage.getItem(globalKey) || '[]') as Array<{
      id: string;
      chatId: string;
      chatName: string;
      content: string;
      timestamp: string;
    }>;
    const filtered = globalStored.filter(
      (item) => !(item.id === actionMessage.id && item.chatId === activeChat?.id)
    );
    if (set.has(actionMessage.id) && activeChat) {
      filtered.push({
        id: actionMessage.id,
        chatId: activeChat.id,
        chatName: activeChat.name || 'Conversation',
        content: actionMessage.content || 'Message',
        timestamp: actionMessage.timestamp,
      });
    }
    localStorage.setItem(globalKey, JSON.stringify(filtered));
    setActionMessage(null);
  };

  const starredKey = activeChat ? `rivvo_starred_${activeChat.id}` : '';
  const starredIds = starredKey ? (JSON.parse(localStorage.getItem(starredKey) || '[]') as string[]) : [];
  const starredMessages = messages.filter((message) => starredIds.includes(message.id));
  const allStarred = useMemo(() => {
    const globalKey = 'rivvo_starred_global';
    return JSON.parse(localStorage.getItem(globalKey) || '[]') as Array<{
      id: string;
      chatId: string;
      chatName: string;
      content: string;
      timestamp: string;
    }>;
  }, [starredOpen]);

  const handleActionDelete = async (scope: 'self' | 'all') => {
    if (!actionMessage || !activeChat) return;
    await deleteMessage(activeChat.id, actionMessage.id, scope);
    setActionMessage(null);
  };

  const handleActionEdit = () => {
    if (!actionMessage) return;
    setEditingMessage(actionMessage);
    setMessageText(actionMessage.content || '');
    setActionMessage(null);
  };

  const handleDeleteSelected = async () => {
    if (!activeChat) return;
    const ids = Array.from(selectedMessages);
    for (const id of ids) {
      await deleteMessage(activeChat.id, id);
    }
    clearSelection();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button onClick={onBack} className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {selectionMode ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-foreground">{selectedMessages.size} selected</p>
            </div>
            <button
              onClick={handleReplySelected}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              disabled={selectedMessages.size !== 1}
            >
              <span className="text-sm text-foreground">Reply</span>
            </button>
            <button
              onClick={handleCopySelected}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              disabled={selectedMessages.size !== 1}
            >
              <span className="text-sm text-foreground">Copy</span>
            </button>
            <button
              onClick={handleForwardSelected}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <span className="text-sm text-foreground">Forward</span>
            </button>
            <button
              onClick={handleDeleteSelected}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <span className="text-sm text-foreground">Delete</span>
            </button>
            <button
              onClick={clearSelection}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </>
        ) : (
          <>
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
              <button
                onClick={() => setStarredOpen(true)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Star className="w-5 h-5 text-foreground" />
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
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--chat-bg)]">
        <div className="space-y-4">
          {messages.map((message) => {
            const isSent = message.senderId === user?.id;
            const bubbleClasses = `px-4 py-2 rounded-2xl ${
              isSent
                ? 'bg-[var(--chat-bubble-sent)] text-white rounded-br-sm'
                : 'bg-[var(--chat-bubble-received)] text-foreground border border-border rounded-bl-sm'
            }`;
            const isSelected = selectedMessages.has(message.id);
            const parsed = parseMessageContent(message.content || '');
            return (
              <div
                key={message.id}
                className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                onPointerDown={(event) => {
                  if (selectionMode) return;
                  longPressRef.current = setTimeout(() => {
                    toggleSelection(message.id);
                  }, 500);
                  swipeRef.current = { id: message.id, startX: event.clientX, startY: event.clientY };
                }}
                onPointerMove={(event) => {
                  if (!swipeRef.current || selectionMode) return;
                  const dx = event.clientX - swipeRef.current.startX;
                  const dy = event.clientY - swipeRef.current.startY;
                  if (Math.abs(dy) > 30) return;
                  if (dx > 60) {
                    setReplyToMessage(message);
                    swipeRef.current = null;
                  }
                }}
                onPointerUp={() => {
                  if (longPressRef.current) {
                    clearTimeout(longPressRef.current);
                    longPressRef.current = null;
                  }
                  swipeRef.current = null;
                }}
                onPointerLeave={() => {
                  if (longPressRef.current) {
                    clearTimeout(longPressRef.current);
                    longPressRef.current = null;
                  }
                  swipeRef.current = null;
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  toggleSelection(message.id);
                }}
              >
                <div className={`max-w-[70%] ${isSent ? 'order-2' : 'order-1'}`}>
                  {selectionMode && (
                    <button
                      onClick={() => toggleSelection(message.id)}
                      className={`mb-1 inline-flex items-center gap-1 text-xs ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  )}
                  {message.type === 'audio' && message.mediaUrl ? (
                    <div>
                      {!isSent && isGroup && (
                        <p className="text-xs text-primary mb-1">Sender Name</p>
                      )}
                      {(parsed.forwarded || parsed.reply) && (
                        <div className="mb-2 rounded-md px-3 py-2 bg-white/10 text-xs border-l-2 border-white/50">
                          {parsed.forwarded && <p className="text-blue-100 font-medium">Forwarded</p>}
                          {parsed.reply && (
                            <div>
                              <p className="text-blue-100 font-medium">{parsed.reply.sender}</p>
                              <p className="text-blue-100/90">{parsed.reply.preview}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <AudioMessage message={message} isSent={isSent} />
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <button
                          onClick={() => setActionMessage(message)}
                          className={`p-1 rounded hover:bg-white/10 ${isSent ? 'text-blue-100' : 'text-muted-foreground'}`}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
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
                  ) : (
                    <div className={bubbleClasses}>
                      {!isSent && isGroup && (
                        <p className="text-xs text-primary mb-1">Sender Name</p>
                      )}
                      {parsed.forwarded && (
                        <p className={`text-xs mb-1 ${isSent ? 'text-blue-100' : 'text-muted-foreground'}`}>Forwarded</p>
                      )}
                      {parsed.reply && (
                        <div className={`mb-2 rounded-md px-2 py-1 text-xs border-l-2 ${isSent ? 'bg-white/15 text-blue-100 border-white/50' : 'bg-muted text-muted-foreground border-primary/50'}`}>
                          <p className="font-medium">{parsed.reply.sender}</p>
                          <p className="opacity-90">{parsed.reply.preview}</p>
                        </div>
                      )}
                      {message.type === 'image' && message.mediaUrl ? (
                        <img
                          src={message.mediaUrl}
                          alt={message.content || 'Image'}
                          className="max-w-full rounded-lg"
                        />
                      ) : message.type === 'video' && message.mediaUrl ? (
                        <video src={message.mediaUrl} controls className="max-w-full rounded-lg" />
                      ) : (
                        <p className="break-words">{message.content}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <button
                          onClick={() => setActionMessage(message)}
                          className={`p-1 rounded hover:bg-white/10 ${isSent ? 'text-blue-100' : 'text-muted-foreground'}`}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
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
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        {replyToMessage && (
          <div className="flex items-start gap-3 mb-3 rounded-lg bg-muted px-3 py-2">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Replying to</p>
              <p className="text-sm text-foreground line-clamp-2">
                {replyToMessage.content || 'Message'}
              </p>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {editingMessage && (
          <div className="flex items-start gap-3 mb-3 rounded-lg bg-muted px-3 py-2">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Editing message</p>
              <p className="text-sm text-foreground line-clamp-2">
                {editingMessage.content || 'Message'}
              </p>
            </div>
            <button
              onClick={() => setEditingMessage(null)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {isRecording ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm">Recording {formatDuration(recordSeconds)}</span>
            </div>
            <div className="flex items-center gap-1 flex-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <span
                  key={idx}
                  className="h-3 w-1 rounded-full bg-primary/70 animate-pulse"
                  style={{ animationDelay: `${idx * 120}ms` }}
                />
              ))}
            </div>
            <button
              onClick={cancelRecording}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={stopRecording}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              aria-label="Send voice note"
            >
              <Square className="w-5 h-5" />
            </button>
          </div>
        ) : voicePreviewUrl ? (
          <div className="flex items-center gap-3">
            <button
              onClick={togglePreviewPlayback}
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
              aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPreviewPlaying ? (
                <Pause className="w-4 h-4 text-foreground" />
              ) : (
                <Play className="w-4 h-4 text-foreground" />
              )}
            </button>
            <div className="flex-1">
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: '100%' }} />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {formatDuration(voicePreviewDuration || 0)}
              </div>
            </div>
            <button
              onClick={discardVoicePreview}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Discard
            </button>
            <button
              onClick={sendVoicePreview}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              aria-label="Send voice note"
            >
              <Send className="w-5 h-5" />
            </button>
            <audio ref={previewAudioRef} src={voicePreviewUrl} preload="metadata" />
          </div>
        ) : (
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
              <button
                onClick={startRecording}
                className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
                aria-label="Record voice note"
              >
                <Mic className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="w-full md:max-w-sm bg-card border border-border rounded-t-xl md:rounded-xl p-4">
            <div className="mb-3">
              <p className="text-foreground font-medium">Message actions</p>
              <p className="text-xs text-muted-foreground">Choose an action</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleActionStar}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground inline-flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Star
              </button>
              <button
                onClick={handleActionForward}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground inline-flex items-center gap-2"
              >
                <Forward className="w-4 h-4" />
                Forward
              </button>
              {actionMessage.senderId === user?.id && (
                <button
                  onClick={handleActionEdit}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleActionDelete('self')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
              >
                Delete for me
              </button>
              {actionMessage.senderId === user?.id && (
                <button
                  onClick={() => handleActionDelete('all')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
                >
                  Delete for everyone
                </button>
              )}
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="mt-4 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {forwardOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="w-full md:max-w-sm bg-card border border-border rounded-t-xl md:rounded-xl p-4">
            <div className="mb-3">
              <p className="text-foreground font-medium">Forward to</p>
              <p className="text-xs text-muted-foreground">Select a conversation</p>
            </div>
            <input
              value={forwardSearch}
              onChange={(event) => setForwardSearch(event.target.value)}
              placeholder="Search chats..."
              className="w-full mb-3 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {forwardTargets.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleForwardToChat(chat.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
                >
                  {chat.name || 'Conversation'}
                </button>
              ))}
              {forwardTargets.length === 0 && (
                <p className="text-sm text-muted-foreground">No chats found</p>
              )}
            </div>
            <button
              onClick={() => setForwardOpen(false)}
              className="mt-4 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {starredOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="w-full md:max-w-sm bg-card border border-border rounded-t-xl md:rounded-xl p-4">
            <div className="mb-3">
              <p className="text-foreground font-medium">Starred messages</p>
              <p className="text-xs text-muted-foreground">Saved in this chat</p>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setStarredScope('chat')}
                className={`px-3 py-1.5 rounded-full text-xs ${starredScope === 'chat' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                This chat
              </button>
              <button
                onClick={() => setStarredScope('all')}
                className={`px-3 py-1.5 rounded-full text-xs ${starredScope === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                All chats
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {starredScope === 'chat' && starredMessages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => {
                    setReplyToMessage(message);
                    setStarredOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
                >
                  <p className="text-sm line-clamp-2">{message.content || 'Message'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: false })}
                  </p>
                </button>
              ))}
              {starredScope === 'all' && allStarred.map((item) => (
                <button
                  key={`${item.chatId}-${item.id}`}
                  onClick={() => {
                    navigate(`/chats/${item.chatId}`);
                    setReplyToMessage({
                      id: item.id,
                      chatId: item.chatId,
                      senderId: '',
                      content: item.content,
                      type: 'text',
                      timestamp: item.timestamp,
                      status: 'sent',
                    });
                    setStarredOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-foreground"
                >
                  <p className="text-xs text-muted-foreground mb-1">{item.chatName}</p>
                  <p className="text-sm line-clamp-2">{item.content || 'Message'}</p>
                </button>
              ))}
              {starredScope === 'chat' && starredMessages.length === 0 && (
                <p className="text-sm text-muted-foreground">No starred messages yet</p>
              )}
              {starredScope === 'all' && allStarred.length === 0 && (
                <p className="text-sm text-muted-foreground">No starred messages yet</p>
              )}
            </div>
            <button
              onClick={() => setStarredOpen(false)}
              className="mt-4 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {forwardingProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm">
            <p className="text-foreground font-medium mb-2">Forwarding messages</p>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
              <div
                className="h-2 bg-primary"
                style={{ width: `${Math.min((forwardingProgress.sent / forwardingProgress.total) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {forwardingProgress.sent} of {forwardingProgress.total} sent
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
