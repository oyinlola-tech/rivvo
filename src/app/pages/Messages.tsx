import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Phone, Video, Send, Paperclip, Mic, Camera, FileText, Download, Flame } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { VerificationBadge } from "../components/VerificationBadge";
import { useAuth } from "../contexts/AuthContext";
import {
  getOrCreateKeyPair,
  importPrivateKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  encryptBytes,
  decryptBytes,
} from "../lib/crypto";
import {
  getConversationSync,
  loadMessages as loadCachedMessages,
  deleteMessage,
  saveMessages,
  setConversationSync
} from "../lib/messageStore";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: "me" | "them";
  senderId?: string;
  readAt?: string | null;
  encrypted?: boolean;
  iv?: string | null;
  viewOnce?: boolean;
  viewOnceViewedAt?: string | null;
  attachment?: Attachment | null;
}

interface PeerInfo {
  id: string;
  name: string;
  avatar?: string | null;
  verified: boolean;
  isVerifiedBadge: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  streakCount?: number;
}

interface Attachment {
  type: "attachment";
  kind: "media" | "document" | "audio" | "voice";
  name: string;
  mime: string;
  size: number;
  url: string;
  iv: string;
}

export default function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  const mediaBase = apiBase.replace(/\/api\/?$/, "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentUrlsRef = useRef<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const viewOnceTimeoutRef = useRef<number | null>(null);

  const contact = peer || {
    id: "",
    name: "John Abraham",
    avatar: null,
    online: true,
    verified: true,
    isVerifiedBadge: true,
    isModerator: false,
    isAdmin: false,
    streakCount: 0,
  };

  useEffect(() => {
    if (id) {
      loadMessages();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);

    const handleIncoming = async (payload: { conversationId: string; message: Message }) => {
      if (payload.message.senderId && payload.message.senderId === user?.id) {
        return;
      }
      if (payload.conversationId === id) {
        let nextMessage = payload.message;
        if (payload.message.viewOnce) {
          nextMessage = payload.message;
        } else if (payload.message.encrypted && payload.message.iv && sharedKey) {
          try {
            const text = await decryptMessage(payload.message.text, payload.message.iv, sharedKey);
            const attachment = parseAttachment(text);
            nextMessage = attachment
              ? { ...payload.message, text, attachment }
              : { ...payload.message, text };
          } catch {
            nextMessage = { ...payload.message, text: "Encrypted message" };
          }
        } else if (payload.message.encrypted) {
          nextMessage = { ...payload.message, text: "Encrypted message" };
        }
        setMessages((prev) => [...prev, nextMessage]);
        if (user?.id) {
          saveMessages(user.id, id, [nextMessage]);
        }
      }
    };

    const handleRead = (payload: { conversationId: string; readAt: string }) => {
      if (payload.conversationId !== id) return;
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.sender === "me" ? { ...msg, readAt: payload.readAt } : msg
        );
        if (user?.id) {
          saveMessages(user.id, id, updated);
        }
        return updated;
      });
    };

    const handleViewOnceViewed = (payload: { conversationId: string; messageId: string; readAt: string }) => {
      if (payload.conversationId !== id) return;
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === payload.messageId ? { ...msg, readAt: payload.readAt } : msg
        );
        if (user?.id) {
          saveMessages(user.id, id, updated);
        }
        return updated;
      });
    };

    const handleTyping = (payload: { conversationId: string; userId?: string }) => {
      if (payload.conversationId !== id) return;
      if (payload.userId && payload.userId === user?.id) return;
      setIsTyping(true);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 2000);
    };

    socket.emit("join_conversation", { conversationId: id });
    socket.on("new_message", handleIncoming);
    socket.on("read_receipt", handleRead);
    socket.on("view_once_viewed", handleViewOnceViewed);
    socket.on("typing", handleTyping);

    return () => {
      socket.emit("leave_conversation", { conversationId: id });
      socket.off("new_message", handleIncoming);
      socket.off("read_receipt", handleRead);
      socket.off("view_once_viewed", handleViewOnceViewed);
      socket.off("typing", handleTyping);
    };
  }, [id, sharedKey, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      Object.values(attachmentUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const parseAttachment = (text: string) => {
    try {
      const parsed = JSON.parse(text) as Attachment;
      if (
        parsed &&
        parsed.type === "attachment" &&
        parsed.url &&
        parsed.iv &&
        parsed.mime &&
        parsed.name
      ) {
        const normalizedUrl =
          parsed.url.startsWith("http://") || parsed.url.startsWith("https://")
            ? parsed.url
            : parsed.url.startsWith("/")
              ? `${mediaBase}${parsed.url}`
              : parsed.url;
        return { ...parsed, url: normalizedUrl };
      }
    } catch {
      return null;
    }
    return null;
  };

  const loadMessages = async () => {
    if (!id || !user?.id) return;
    setError("");
    const cached = await loadCachedMessages(user.id, id);
    if (cached.length) {
      const hydratedCached = cached.map((msg) => {
        const attachment = parseAttachment(msg.text);
        return attachment ? { ...msg, attachment } : msg;
      });
      setMessages(hydratedCached);
      setLoading(false);
    }

    let derivedKey: CryptoKey | null = null;
    const peerResponse = await api.getConversationPeer(id);
    if (peerResponse.success && peerResponse.data?.publicKey) {
      setPeer({
        id: peerResponse.data.id,
        name: peerResponse.data.name,
        avatar: peerResponse.data.avatar,
        verified: peerResponse.data.verified,
        isVerifiedBadge: peerResponse.data.isVerifiedBadge,
        isModerator: peerResponse.data.isModerator,
        isAdmin: peerResponse.data.isAdmin,
        streakCount: peerResponse.data.streakCount
      });
      const keyPair = await getOrCreateKeyPair();
      const privateKey = await importPrivateKey(keyPair.privateKey);
      const peerPublic = await importPublicKey(JSON.parse(peerResponse.data.publicKey));
      derivedKey = await deriveSharedKey(privateKey, peerPublic);
      setSharedKey(derivedKey);
    } else if (peerResponse.success && peerResponse.data) {
      setPeer({
        id: peerResponse.data.id,
        name: peerResponse.data.name,
        avatar: peerResponse.data.avatar,
        verified: peerResponse.data.verified,
        isVerifiedBadge: peerResponse.data.isVerifiedBadge,
        isModerator: peerResponse.data.isModerator,
        isAdmin: peerResponse.data.isAdmin,
        streakCount: peerResponse.data.streakCount
      });
    } else if (!peerResponse.success) {
      setError(peerResponse.error || "Failed to load conversation details");
    }

    const lastSync = await getConversationSync(user.id, id);
    const response = await api.getMessages(id, {
      since: lastSync || undefined,
      markRead: true,
    });
    const incomingRaw = Array.isArray(response.data)
      ? response.data
      : response.data?.messages;
    if (response.success && incomingRaw) {
      const incoming = await Promise.all(
        incomingRaw.map(async (msg: Message) => {
          if (msg.viewOnce) {
            return msg;
          }
        if (msg.encrypted && msg.iv && derivedKey) {
          try {
            const text = await decryptMessage(msg.text, msg.iv, derivedKey);
            const attachment = parseAttachment(text);
            return attachment ? { ...msg, text, attachment } : { ...msg, text };
          } catch {
            return { ...msg, text: "Encrypted message" };
          }
        }
          if (msg.encrypted) {
            return { ...msg, text: "Encrypted message" };
          }
          return msg;
        })
      );

      const mergedMap = new Map<string, Message>();
      const mergedSource = cached.map((msg) => {
        const attachment = parseAttachment(msg.text);
        return attachment ? { ...msg, attachment } : msg;
      });
      [...mergedSource, ...incoming].forEach((msg) => mergedMap.set(msg.id, msg));
      const merged = Array.from(mergedMap.values()).sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp)
      );

      setMessages(merged);
      await saveMessages(user.id, id, incoming);
      if (response.data?.serverTime) {
        await setConversationSync(user.id, id, response.data.serverTime);
      }
    } else if (!response.success) {
      setError(response.error || "Failed to load messages");
    }
    await api.markConversationRead(id);
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !id) return;

    const tempId = Date.now().toString();
    const tempMessage: Message = {
      id: tempId,
      text: newMessage,
      timestamp: new Date().toISOString(),
      sender: "me",
      readAt: null,
      viewOnce: viewOnceMode,
    };

    setMessages([...messages, tempMessage]);
    setNewMessage("");
    setError("");

    let response;
    if (sharedKey) {
      const encrypted = await encryptMessage(newMessage, sharedKey);
      response = await api.sendEncryptedMessage(id, { ...encrypted, viewOnce: viewOnceMode });
    } else {
      response = await api.sendMessage(id, newMessage, viewOnceMode);
    }

    if (!response.success) {
      setError(response.error || "Failed to send message");
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      return;
    }

    setViewOnceMode(false);
    await loadMessages();
  };

  const handleStartCall = async (type: "audio" | "video") => {
    if (!peer?.id) {
      setError("Unable to start call: missing participant.");
      return;
    }

    setError("");
    const response = await api.initiateCall(peer.id, type);
    if (!response.success || !response.data?.callId || !response.data?.roomUrl) {
      setError(response.error || "Failed to start call");
      return;
    }

    const callWindow = window.open(response.data.roomUrl, "_blank", "noopener,noreferrer");
    if (!callWindow) {
      setError("Popup blocked. Please allow popups to start a call.");
      return;
    }

    const callId = response.data.callId;
    const watcher = window.setInterval(async () => {
      if (callWindow.closed) {
        window.clearInterval(watcher);
        await api.endCall(callId);
      }
    }, 1000);
  };

  const handleReportUser = async () => {
    if (!peer?.id || !id) return;
    const reason = window.prompt("Why are you reporting this user?");
    if (!reason) return;
    const block = window.confirm("Block this user as well?");
    const response = await api.reportUser({
      reportedUserId: peer.id,
      reason,
      conversationId: id,
      block,
    });
    if (!response.success) {
      setError(response.error || "Failed to submit report");
      return;
    }
    if (block) {
      setError("User reported and blocked");
    }
  };

  const handleBlockUser = async () => {
    if (!peer?.id) return;
    const confirmBlock = window.confirm("Block this user? They will not be able to message you.");
    if (!confirmBlock) return;
    const response = await api.blockUser(peer.id);
    if (!response.success) {
      setError(response.error || "Failed to block user");
      return;
    }
    setError("User blocked");
  };

  const handleReportMessage = async (messageId: string) => {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason) return;
    const block = window.confirm("Block this user as well?");
    const response = await api.reportMessage({ messageId, reason, block });
    if (!response.success) {
      setError(response.error || "Failed to report message");
    } else if (block) {
      setError("Message reported and user blocked");
    }
  };

  const handleViewOnce = async (message: Message) => {
    if (!id || !user?.id) return;
    if (message.sender !== "them") return;

    let revealText = message.text;
    if (message.encrypted) {
      if (!message.iv || !sharedKey) {
        setError("Unable to decrypt this message");
        return;
      }
      try {
        revealText = await decryptMessage(message.text, message.iv, sharedKey);
      } catch {
        setError("Unable to decrypt this message");
        return;
      }
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === message.id
          ? { ...msg, text: revealText, viewOnceViewedAt: new Date().toISOString() }
          : msg
      )
    );

    await api.viewOnceMessage(id, message.id);

    if (viewOnceTimeoutRef.current) {
      window.clearTimeout(viewOnceTimeoutRef.current);
    }
    viewOnceTimeoutRef.current = window.setTimeout(async () => {
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      await deleteMessage(message.id);
    }, 5000);
  };

  const handleTypingInput = (value: string) => {
    setNewMessage(value);
    if (!id) return;
    const token = localStorage.getItem("authToken");
    const socket = getSocket(token);
    socket.emit("typing", { conversationId: id, userId: user?.id });
  };

  const ALLOWED_MIMES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "video/mp4",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "audio/mpeg",
    "audio/mp3",
    "audio/webm",
    "audio/ogg",
  ]);

  const MAX_FILE_SIZE = 40 * 1024 * 1024;

  const inferKind = (type: string) => {
    if (type.startsWith("image/") || type.startsWith("video/")) return "media";
    if (type.startsWith("audio/")) return "audio";
    return "document";
  };

  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be 40MB or less");
      return false;
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      setError("Unsupported file type");
      return false;
    }
    return true;
  };

  const uploadEncryptedAttachment = async (file: File, kindOverride?: "voice") => {
    if (!id) return;
    if (!sharedKey) {
      setError("Encrypted attachments require an active encryption key");
      return;
    }
    if (!validateFile(file)) return;

    setUploading(true);
    setError("");
    try {
      const buffer = await file.arrayBuffer();
      const encryptedFile = await encryptBytes(buffer, sharedKey);
      const encryptedBlob = new Blob([encryptedFile.cipherBuffer], {
        type: "application/octet-stream",
      });

      const formData = new FormData();
      formData.append("file", encryptedBlob, `${file.name}.enc`);
      formData.append("fileType", file.type);
      formData.append("fileName", file.name);
      formData.append("kind", kindOverride || inferKind(file.type));

      const upload = await api.uploadAttachment(id, formData);
      if (!upload.success || !upload.data) {
        setError(upload.error || "Failed to upload attachment");
        return;
      }

      const payload: Attachment = {
        type: "attachment",
        kind: (kindOverride || inferKind(file.type)) as Attachment["kind"],
        name: upload.data.fileName || file.name,
        mime: file.type,
        size: file.size,
        url: upload.data.url,
        iv: encryptedFile.iv,
      };

      const encryptedMeta = await encryptMessage(JSON.stringify(payload), sharedKey);
      const response = await api.sendEncryptedMessage(id, { ...encryptedMeta, viewOnce: false });
      if (!response.success) {
        setError(response.error || "Failed to send attachment");
        return;
      }
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      await uploadEncryptedAttachment(file);
    }
  };

  const handleMediaPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      await uploadEncryptedAttachment(file);
    }
  };

  const handleToggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const voiceFile = new File([blob], `voice-note-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });
        await uploadEncryptedAttachment(voiceFile, "voice");
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied");
    }
  };

  const handleDecryptAttachment = async (message: Message) => {
    if (!message.attachment || !sharedKey) return;
    if (attachmentUrls[message.id]) return;
    try {
      const response = await fetch(message.attachment.url);
      const encryptedBuffer = await response.arrayBuffer();
      const plainBuffer = await decryptBytes(encryptedBuffer, message.attachment.iv, sharedKey);
      const blob = new Blob([plainBuffer], { type: message.attachment.mime });
      const url = URL.createObjectURL(blob);
      setAttachmentUrls((prev) => {
        const next = { ...prev, [message.id]: url };
        attachmentUrlsRef.current = next;
        return next;
      });
    } catch {
      setError("Unable to decrypt attachment");
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!id) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-gray-500">Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background md:ml-64">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="md:hidden text-[#667781]">
          <ArrowLeft size={22} />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-bold">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            contact.name[0]
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{contact.name}</h2>
            {(contact.isVerifiedBadge || contact.isModerator || contact.isAdmin) && (
              <VerificationBadge
                type={contact.isModerator || contact.isAdmin ? "staff" : "user"}
                size="sm"
              />
            )}
            {contact.streakCount && contact.streakCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs text-[#1a8c7a]">
                <Flame size={12} />
                {contact.streakCount}
              </span>
            )}
          </div>
          <p className="text-xs text-[#667781]">
            {"online" in contact && contact.online ? "Active now" : "Offline"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleStartCall("audio")}
            className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center"
          >
            <Phone size={18} className="text-[#667781]" />
          </button>
          <button
            onClick={() => handleStartCall("video")}
            className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center"
          >
            <Video size={18} className="text-[#667781]" />
          </button>
          <button
            onClick={handleReportUser}
            className="px-3 py-2 rounded-full text-xs text-[#667781] hover:bg-black/5"
          >
            Report
          </button>
          <button
            onClick={handleBlockUser}
            className="px-3 py-2 rounded-full text-xs text-[#667781] hover:bg-black/5"
          >
            Block
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-[#efeae2]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a8c7a]"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2 shadow-sm ${
                    message.sender === "me"
                      ? "bg-[#1a8c7a] text-white rounded-br-sm"
                      : "bg-white text-gray-900 rounded-bl-sm"
                  }`}
                >
                  <div className="space-y-1.5">
                    {message.viewOnce ? (
                      message.sender === "them" && !message.viewOnceViewedAt ? (
                        <button
                          onClick={() => handleViewOnce(message)}
                          className="text-sm font-medium underline"
                        >
                          View once message
                        </button>
                      ) : message.sender === "me" ? (
                        <p className="text-sm">View once message</p>
                      ) : (
                        <p className="text-sm">{message.text}</p>
                      )
                    ) : message.attachment ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} />
                          <span className="text-sm font-medium">{message.attachment.name}</span>
                        </div>
                        {attachmentUrls[message.id] ? (
                          message.attachment.mime.startsWith("image/") ? (
                            <img
                              src={attachmentUrls[message.id]}
                              alt={message.attachment.name}
                              className="max-h-64 rounded-lg"
                            />
                          ) : message.attachment.mime.startsWith("video/") ? (
                            <video controls src={attachmentUrls[message.id]} className="w-full rounded-lg" />
                          ) : message.attachment.mime.startsWith("audio/") ? (
                            <audio controls src={attachmentUrls[message.id]} className="w-full" />
                          ) : (
                            <a
                              href={attachmentUrls[message.id]}
                              download={message.attachment.name}
                              className="inline-flex items-center gap-2 text-sm underline"
                            >
                              <Download size={14} /> Download
                            </a>
                          )
                        ) : (
                          <button
                            onClick={() => handleDecryptAttachment(message)}
                            className="text-sm underline"
                          >
                            Open attachment
                          </button>
                        )}
                        <p className="text-xs text-gray-400">
                          {(message.attachment.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm">{message.text}</p>
                    )}
                    <div className="flex items-center justify-end gap-1 text-[11px]">
                      <span
                        className={
                          message.sender === "me" ? "text-white/80" : "text-[#667781]"
                        }
                      >
                        {formatTime(message.timestamp)}
                      </span>
                      {message.sender === "me" && message.readAt ? (
                        <span className="text-white/80">Seen</span>
                      ) : null}
                    </div>
                  </div>
                  {message.sender === "them" && !message.viewOnce && (
                    <button
                      onClick={() => handleReportMessage(message.id)}
                      className="mt-1 text-[11px] underline text-[#667781]"
                    >
                      Report message
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-xs text-gray-500">Typing...</div>}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-background border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFilePick}
            accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.mp3,.gif,.jpg,.jpeg,.png,.mp4"
          />
          <input
            ref={mediaInputRef}
            type="file"
            className="hidden"
            onChange={handleMediaPick}
            accept=".gif,.jpg,.jpeg,.png,.mp4"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center"
            disabled={uploading}
          >
            <Paperclip size={20} className="text-[#667781]" />
          </button>
          <button
            onClick={() => mediaInputRef.current?.click()}
            className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center"
            disabled={uploading}
          >
            <Camera size={20} className="text-[#667781]" />
          </button>
          <button
            onClick={() => setViewOnceMode((prev) => !prev)}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              viewOnceMode ? "bg-[#1a8c7a] text-white" : "hover:bg-black/5 text-[#667781]"
            }`}
            title="Send view-once message"
          >
            <span className="text-xs font-semibold">1x</span>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTypingInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Write your message"
            className="flex-1 px-4 py-2.5 bg-[#f0f2f5] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
          />
          {newMessage.trim() ? (
            <button
              onClick={handleSend}
              className="w-10 h-10 rounded-full bg-[#1a8c7a] flex items-center justify-center shadow-sm"
            >
              <Send size={20} className="text-white" />
            </button>
          ) : (
            <button
              onClick={handleToggleRecording}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                recording ? "bg-red-50 text-red-600" : "hover:bg-black/5 text-[#667781]"
              }`}
              disabled={uploading}
            >
              <Mic size={20} className={recording ? "text-red-600" : "text-[#667781]"} />
            </button>
          )}
        </div>
        {uploading && <p className="mt-2 text-xs text-gray-500">Uploading encrypted file...</p>}
        {recording && <p className="mt-2 text-xs text-red-600">Recording voice note...</p>}
      </div>
    </div>
  );
}





