import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Phone, Video, Send, Paperclip, Mic, Camera, FileText, Download, Flame, Check, CheckCheck, Smile } from "lucide-react";
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
import { useCall } from "../contexts/CallContext";
import { preloadImage } from "../lib/imageCache";
import EmojiPicker from "../components/EmojiPicker";
import { getConversationStreak, recordConversationActivity } from "../lib/streak";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: "me" | "them";
  senderId?: string;
  readAt?: string | null;
  deliveredAt?: string | null;
  editedAt?: string | null;
  deletedForAllAt?: string | null;
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
  online?: boolean;
  verified: boolean;
  isVerifiedBadge: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  streakCount?: number;
  isGroup?: boolean;
  isPrivate?: boolean;
  memberCount?: number;
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
  const { startCall } = useCall();
  const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  const mediaBase = apiBase.replace(/\/api\/?$/, "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [actionMessageId, setActionMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [avatarTransform, setAvatarTransform] = useState({ scale: 1, x: 0, y: 0 });
  const avatarTouchStartRef = useRef<number | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentUrlsRef = useRef<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const viewOnceTimeoutRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportBlock, setReportBlock] = useState(false);
  const [localStreak, setLocalStreak] = useState(0);
  const reportSuggestions = [
    "Spam or scam",
    "Harassment or hate speech",
    "Impersonation",
    "Inappropriate content",
    "Other",
  ];

  const contact = peer;
  const firstName = contact?.name?.trim().split(" ")[0] || contact?.name || "";
  const canNavigateProfile = Boolean(contact?.id && !contact?.isGroup);
  const isGroupChat = Boolean(contact?.isGroup);
  const streakValue = Math.max(contact?.streakCount ?? 0, localStreak);

  const handleMessageLongPressStart = (messageId: string) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setActionMessageId(messageId);
    }, 450);
  };

  const handleMessageLongPressEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
  };

  useEffect(() => {
    if (id) {
      loadMessages();
      if (user?.id) {
        setLocalStreak(getConversationStreak(user.id, id).count);
      }
    }
  }, [id, user?.id]);

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
          const updated = recordConversationActivity(user.id, id);
          setLocalStreak(updated.count);
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

    const handleDelivery = (payload: { conversationId: string; messageIds: string[]; deliveredAt: string }) => {
      if (payload.conversationId !== id) return;
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.sender === "me" && payload.messageIds.includes(msg.id)
            ? { ...msg, deliveredAt: payload.deliveredAt }
            : msg
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

    const handleMessageEdited = async (payload: {
      conversationId: string;
      message: { id: string; text: string; iv?: string | null; encrypted?: boolean; editedAt?: string | null };
    }) => {
      if (payload.conversationId !== id) return;
      let nextText = payload.message.text;
      let encryptedFlag = Boolean(payload.message.encrypted);
      if (payload.message.encrypted) {
        if (payload.message.iv && sharedKey) {
          try {
            nextText = await decryptMessage(payload.message.text, payload.message.iv, sharedKey);
          } catch {
            nextText = "Encrypted message";
          }
        } else {
          nextText = "Encrypted message";
        }
      }
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === payload.message.id
            ? {
                ...msg,
                text: nextText,
                iv: payload.message.iv || null,
                encrypted: encryptedFlag,
                editedAt: payload.message.editedAt || new Date().toISOString(),
              }
            : msg
        );
        if (user?.id) {
          saveMessages(user.id, id, updated);
        }
        return updated;
      });
    };

    const handleMessageDeleted = (payload: { conversationId: string; messageId: string; deletedAt: string }) => {
      if (payload.conversationId !== id) return;
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === payload.messageId
            ? { ...msg, deletedForAllAt: payload.deletedAt, text: "" }
            : msg
        );
        if (user?.id) {
          saveMessages(user.id, id, updated);
        }
        return updated;
      });
    };

    socket.emit("join_conversation", { conversationId: id });
    socket.on("new_message", handleIncoming);
    socket.on("read_receipt", handleRead);
    socket.on("delivery_receipt", handleDelivery);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("view_once_viewed", handleViewOnceViewed);
    socket.on("typing", handleTyping);
    const handleUserOnline = (payload: { userId: string }) => {
      if (payload.userId === peer?.id) {
        setPeer((prev) => (prev ? { ...prev, online: true } : prev));
      }
    };
    const handleUserOffline = (payload: { userId: string }) => {
      if (payload.userId === peer?.id) {
        setPeer((prev) => (prev ? { ...prev, online: false } : prev));
      }
    };
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);

    return () => {
      socket.emit("leave_conversation", { conversationId: id });
      socket.off("new_message", handleIncoming);
      socket.off("read_receipt", handleRead);
      socket.off("delivery_receipt", handleDelivery);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("view_once_viewed", handleViewOnceViewed);
      socket.off("typing", handleTyping);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
    };
  }, [id, sharedKey, user?.id, peer?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(() => {
      loadMessages();
    }, 15000);
    const handleFocus = () => loadMessages();
    const handleVisibility = () => {
      if (!document.hidden) loadMessages();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [id, user?.id, sharedKey]);

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
    } else {
      setLoading(true);
    }

    let derivedKey: CryptoKey | null = null;
    const peerResponse = await api.getConversationPeer(id);
    if (peerResponse.success && peerResponse.data) {
      const peerData = peerResponse.data;
      setPeer({
        id: peerData.id,
        name: peerData.name,
        avatar: peerData.avatar,
        online: peerData.online,
        verified: peerData.verified,
        isVerifiedBadge: peerData.isVerifiedBadge,
        isModerator: peerData.isModerator,
        isAdmin: peerData.isAdmin,
        streakCount: peerData.streakCount || undefined,
        isGroup: peerData.isGroup,
        isPrivate: peerData.isPrivate,
        memberCount: peerData.memberCount
      });
      if (peerData.avatar) {
        preloadImage(peerData.avatar);
      }
      if (peerData.publicKey && !peerData.isGroup) {
        const keyPair = await getOrCreateKeyPair();
        const privateKey = await importPrivateKey(keyPair.privateKey);
        const peerPublic = await importPublicKey(JSON.parse(peerData.publicKey));
        derivedKey = await deriveSharedKey(privateKey, peerPublic);
      }
      setSharedKey(derivedKey);
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
    const outgoingText = newMessage.trim();
    if (!outgoingText || !id) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);

    let tempId: string | null = null;
    if (!editingMessageId) {
      tempId = Date.now().toString();
      const tempMessage: Message = {
        id: tempId,
        text: outgoingText,
        timestamp: new Date().toISOString(),
        sender: "me",
        readAt: null,
        viewOnce: viewOnceMode,
      };
      setMessages((prev) => [...prev, tempMessage]);
    }
    setNewMessage("");
    setError("");

    let response;
    if (editingMessageId) {
      if (sharedKey) {
        const encrypted = await encryptMessage(outgoingText, sharedKey);
        response = await api.editMessage(id, editingMessageId, { ...encrypted, encrypted: true });
      } else {
        response = await api.editMessage(id, editingMessageId, { message: outgoingText, encrypted: false });
      }
    } else if (sharedKey) {
      const encrypted = await encryptMessage(outgoingText, sharedKey);
      response = await api.sendEncryptedMessage(id, { ...encrypted, viewOnce: viewOnceMode });
    } else {
      response = await api.sendMessage(id, outgoingText, viewOnceMode);
    }

    try {
      if (!response.success) {
        setError(response.error || "Failed to send message");
        if (tempId) {
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        }
        return;
      }

      if (!editingMessageId && tempId) {
        if (response.data) {
          let nextText = outgoingText;
          if (response.data.encrypted && response.data.iv && sharedKey) {
            try {
              nextText = await decryptMessage(response.data.text, response.data.iv, sharedKey);
            } catch {
              nextText = "Encrypted message";
            }
          } else if (response.data.encrypted) {
            nextText = "Encrypted message";
          }
          const attachment = parseAttachment(nextText);
          const hydrated: Message = attachment
            ? { ...response.data, text: nextText, attachment }
            : { ...response.data, text: nextText };
          setMessages((prev) => prev.map((msg) => (msg.id === tempId ? hydrated : msg)));
          if (user?.id) {
            await saveMessages(user.id, id, [hydrated]);
          }
        } else {
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        }
      }

      setViewOnceMode(false);
      setEditingMessageId(null);
      if (user?.id && id) {
        const updated = recordConversationActivity(user.id, id);
        setLocalStreak(updated.count);
      }
      await loadMessages();
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const startEditMessage = async (message: Message) => {
    if (message.sender !== "me") return;
    if (message.viewOnce || message.attachment || message.deletedForAllAt) return;
    if (message.encrypted && sharedKey && message.iv) {
      try {
        const text = await decryptMessage(message.text, message.iv, sharedKey);
        setNewMessage(text);
      } catch {
        setError("Unable to decrypt this message for editing");
        return;
      }
    } else {
      setNewMessage(message.text);
    }
    setEditingMessageId(message.id);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setNewMessage("");
  };

  const handleDeleteMessage = async (message: Message, scope: "self" | "all") => {
    if (!id) return;
    const response = await api.deleteMessage(id, message.id, scope);
    if (!response.success) {
      setError(response.error || "Failed to delete message");
      return;
    }
    if (scope === "self") {
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      await deleteMessage(message.id);
    } else {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, deletedForAllAt: new Date().toISOString(), text: "" } : msg
        )
      );
    }
  };

  const handleStartCall = async (type: "audio" | "video") => {
    if (!peer?.id) {
      setError("Unable to start call: missing participant.");
      return;
    }
    setError("");
    await startCall(
      {
        id: peer.id,
        name: peer.name,
        avatar: peer.avatar ?? null,
        isVerifiedBadge: peer.isVerifiedBadge,
        isModerator: peer.isModerator,
        isAdmin: peer.isAdmin,
      },
      type
    );
  };

  const handleReportMessage = async (messageId: string) => {
    if (!reportReason.trim()) {
      setError("Please select or enter a report reason.");
      return;
    }
    const response = await api.reportMessage({ messageId, reason: reportReason.trim(), block: reportBlock });
    if (!response.success) {
      setError(response.error || "Failed to report message");
    } else if (reportBlock) {
      setError("Message reported and user blocked");
    } else {
      setError("Message reported");
    }
    setReportMessageId(null);
    setReportReason("");
    setReportBlock(false);
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
    "audio/opus",
    "audio/wav",
    "audio/x-wav",
    "application/ogg",
    "audio/x-opus+ogg",
    "audio/mp4",
    "audio/m4a",
  ]);

  const MAX_FILE_SIZE = 40 * 1024 * 1024;

  const inferKind = (type: string) => {
    if (type.startsWith("image/") || type.startsWith("video/")) return "media";
    if (type.startsWith("audio/")) return "audio";
    return "document";
  };

  const normalizeMime = (value: string) => value.split(";")[0].trim();

  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be 40MB or less");
      return false;
    }
    const normalized = normalizeMime(file.type || "");
    const ext = file.name.toLowerCase();
    const isAudioByExt = ext.endsWith(".ogg") || ext.endsWith(".opus") || ext.endsWith(".webm") || ext.endsWith(".m4a") || ext.endsWith(".mp3");
    if (!normalized && isAudioByExt) {
      return true;
    }
    if (!ALLOWED_MIMES.has(normalized)) {
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
      const preferredMimeTypes = [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
      ];
      const selectedMimeType =
        preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(stream, {
        ...(selectedMimeType ? { mimeType: selectedMimeType } : {}),
        audioBitsPerSecond: 32000,
      });
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const finalType = normalizeMime(recorder.mimeType || "audio/ogg");
        const extension =
          finalType.includes("ogg")
            ? "ogg"
            : finalType.includes("mp4")
              ? "mp4"
              : "webm";
        const blob = new Blob(chunks, { type: finalType });
        const voiceFile = new File([blob], `voice-note-${Date.now()}.${extension}`, {
          type: finalType,
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

  const truncatePreview = (text: string, maxLength: number = 9) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  const getLastMessagePreview = () => {
    if (!messages.length) return "No messages yet";
    const last = messages[messages.length - 1];
    let preview = "";
    if (last.viewOnce) {
      preview = "View once message";
    } else if (last.attachment) {
      if (last.attachment.mime.startsWith("audio/")) preview = "Voice note";
      else if (last.attachment.mime.startsWith("image/")) preview = "Photo";
      else if (last.attachment.mime.startsWith("video/")) preview = "Video";
      else preview = last.attachment.name || "Attachment";
    } else if (last.encrypted && (!last.text || last.text === "Encrypted message")) {
      preview = "New message";
    } else {
      preview = last.text || "No messages yet";
    }
    return truncatePreview(preview);
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
        {contact ? (
          <button
            onClick={() => {
              if (contact.isGroup) {
                navigate(`/groups/${contact.id}`);
                return;
              }
              if (contact.avatar) {
                setAvatarTransform({ scale: 1, x: 0, y: 0 });
                setShowAvatarPreview(true);
                return;
              }
              if (contact.id) {
                navigate(`/users/${contact.id}`);
              }
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-bold overflow-hidden"
            aria-label={`View ${contact.name} ${contact.isGroup ? "group" : "profile"}`}
            aria-disabled={!canNavigateProfile}
          >
            {contact.avatar ? (
              <img
                src={contact.avatar}
                alt={contact.name}
                className="w-full h-full rounded-full object-cover"
                loading="eager"
                decoding="async"
              />
            ) : (
              contact.name[0]
            )}
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" aria-hidden="true" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {contact ? (
              <>
                <h2 className="font-semibold">
                  <span className="md:hidden">{firstName}</span>
                  <span className="hidden md:inline">{contact.name}</span>
                </h2>
                {!isGroupChat && (contact.isVerifiedBadge || contact.isModerator || contact.isAdmin) && (
                  <VerificationBadge
                    type={contact.isModerator || contact.isAdmin ? "staff" : "user"}
                    size="sm"
                  />
                )}
                {!isGroupChat && streakValue > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e5] px-2 py-0.5 text-xs text-[#b45309]">
                    <Flame size={12} className="text-[#b45309]" />
                    {streakValue}
                  </span>
                )}
              </>
            ) : (
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" aria-hidden="true" />
            )}
          </div>
          {contact ? (
            <p className="text-[11px] text-[#667781]">
              {isGroupChat
                ? `${contact.isPrivate ? "Private group" : "Public group"} • ${
                    contact.memberCount ? `${contact.memberCount} members` : "Group chat"
                  }`
                : isTyping
                ? "Typing..."
                : contact.online
                ? "Active now"
                : "Offline"}
            </p>
          ) : (
            <>
              <div className="mt-2 h-3 w-40 rounded bg-gray-200 animate-pulse" aria-hidden="true" />
              <div className="mt-2 h-3 w-20 rounded bg-gray-200 animate-pulse" aria-hidden="true" />
            </>
          )}
        </div>
        {!isGroupChat && (
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
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-[#efeae2]"
        onClick={() => setActionMessageId(null)}
      >
        {loading && messages.length === 0 ? (
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
                  onTouchStart={() => handleMessageLongPressStart(message.id)}
                  onTouchEnd={handleMessageLongPressEnd}
                  onTouchCancel={handleMessageLongPressEnd}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setActionMessageId(message.id);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (actionMessageId === message.id && !longPressTriggeredRef.current) {
                      setActionMessageId(null);
                    }
                    longPressTriggeredRef.current = false;
                  }}
                >
                  <div className="space-y-1.5">
                    {message.deletedForAllAt ? (
                      <p className="text-sm italic text-[#667781]">Message deleted</p>
                    ) : message.viewOnce ? (
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
                              loading="lazy"
                              decoding="async"
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
                      {message.sender === "me" ? (
                        message.readAt ? (
                          <CheckCheck size={14} className="text-[#4FC3F7]" />
                        ) : message.deliveredAt ? (
                          <CheckCheck size={14} className="text-[#667781]" />
                        ) : (
                          <Check size={14} className="text-[#667781]" />
                        )
                      ) : null}
                      {message.editedAt && !message.deletedForAllAt ? (
                        <span
                          className={
                            message.sender === "me" ? "text-[10px] text-white/70" : "text-[10px] text-[#667781]"
                          }
                        >
                          Edited
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {actionMessageId === message.id && message.sender === "me" &&
                    !message.viewOnce &&
                    !message.attachment &&
                    !message.deletedForAllAt && (
                      <div className="mt-1 flex gap-3 text-[11px]">
                        <button
                          onClick={() => startEditMessage(message)}
                          className="underline text-[#667781]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message, "self")}
                          className="underline text-[#667781]"
                        >
                          Delete for me
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message, "all")}
                          className="underline text-[#EA3736]"
                        >
                          Delete for everyone
                        </button>
                      </div>
                    )}
                  {actionMessageId === message.id &&
                    message.sender === "them" &&
                    !message.viewOnce &&
                    !message.deletedForAllAt && (
                      <button
                        onClick={() => {
                          setReportMessageId(message.id);
                          setReportReason("");
                          setReportBlock(false);
                        }}
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
      <div className="bg-background border-t border-border px-4 py-3 sticky bottom-0 z-10">
        {editingMessageId && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-[#f0f2f5] px-3 py-2 text-xs text-[#667781]">
            <span>Editing message</span>
            <button onClick={cancelEdit} className="text-[#1a8c7a]">
              Cancel
            </button>
          </div>
        )}
        <div className="relative flex items-center gap-2">
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
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center"
            title="Emoji"
          >
            <Smile size={20} className="text-[#667781]" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleTypingInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Write your message"
            className="flex-1 px-4 py-2.5 bg-[#f0f2f5] text-[#111b21] placeholder:text-[#667781] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a8c7a] dark:bg-[#1b1f23] dark:text-white dark:placeholder:text-white/60"
          />
          {showEmojiPicker && (
            <div className="absolute bottom-14 left-0 z-20">
              <EmojiPicker
                onSelect={(emoji) => {
                  handleTypingInput(`${newMessage}${emoji}`);
                  setShowEmojiPicker(false);
                }}
                variant="light"
              />
            </div>
          )}
          {newMessage.trim() ? (
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-10 h-10 rounded-full bg-[#1a8c7a] flex items-center justify-center shadow-sm disabled:opacity-60"
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

      {showAvatarPreview && contact?.avatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ animation: "modal-fade 180ms ease-out" }}
            onClick={() => setShowAvatarPreview(false)}
          />
          <div
            className="relative w-full max-w-md text-white"
            style={{ animation: "modal-zoom 200ms ease-out" }}
            onTouchStart={(event) => {
              if (event.touches.length === 2) {
                const a = event.touches.item(0);
                const b = event.touches.item(1);
                if (!a || !b) return;
                const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                pinchStartRef.current = { dist, scale: avatarTransform.scale };
                return;
              }
              const touch = event.touches[0];
              avatarTouchStartRef.current = touch?.clientY ?? null;
              if (avatarTransform.scale > 1 && touch) {
                dragStartRef.current = {
                  x: touch.clientX,
                  y: touch.clientY,
                  originX: avatarTransform.x,
                  originY: avatarTransform.y,
                };
              }
            }}
            onTouchMove={(event) => {
              if (event.touches.length === 2 && pinchStartRef.current) {
                const a = event.touches.item(0);
                const b = event.touches.item(1);
                if (!a || !b) return;
                const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                const nextScale = Math.min(3, Math.max(1, (dist / pinchStartRef.current.dist) * pinchStartRef.current.scale));
                setAvatarTransform((prev) => ({ ...prev, scale: nextScale }));
                return;
              }
              const touch = event.touches[0];
              if (dragStartRef.current && touch) {
                const nextX = dragStartRef.current.originX + (touch.clientX - dragStartRef.current.x);
                const nextY = dragStartRef.current.originY + (touch.clientY - dragStartRef.current.y);
                setAvatarTransform((prev) => ({ ...prev, x: nextX, y: nextY }));
                return;
              }
              if (avatarTouchStartRef.current === null) return;
              const currentY = touch?.clientY ?? 0;
              if (currentY - avatarTouchStartRef.current > 120 && avatarTransform.scale <= 1.01) {
                setShowAvatarPreview(false);
              }
            }}
            onTouchEnd={() => {
              avatarTouchStartRef.current = null;
              pinchStartRef.current = null;
              dragStartRef.current = null;
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">{contact.name}</div>
              <button
                onClick={() => setShowAvatarPreview(false)}
                className="text-sm text-white/80"
              >
                Close
              </button>
            </div>
            <div className="w-full aspect-square rounded-3xl overflow-hidden bg-black shadow-2xl">
              <img
                src={contact.avatar}
                alt={contact.name}
                className="w-full h-full object-cover transition-transform duration-150"
                loading="eager"
                decoding="async"
                style={{
                  transform: `translate(${avatarTransform.x}px, ${avatarTransform.y}px) scale(${avatarTransform.scale})`,
                }}
                onClick={() =>
                  setAvatarTransform((prev) =>
                    prev.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }
                  )
                }
              />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => {
                  setShowAvatarPreview(false);
                  if (contact.id) {
                    navigate(`/users/${contact.id}`);
                  }
                }}
                className="rounded-full bg-white/10 px-5 py-2 text-sm text-white hover:bg-white/20"
              >
                View profile
              </button>
            </div>
          </div>
        </div>
      )}

      {reportMessageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[#111b21]">Report message</h3>
                <p className="text-sm text-[#667781]">Select a reason or type your own.</p>
              </div>
              <button
                onClick={() => setReportMessageId(null)}
                className="text-sm text-[#667781]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {reportSuggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setReportReason(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    reportReason === item
                      ? "bg-[#1a8c7a] text-white"
                      : "bg-[#f0f2f5] text-[#111b21]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-[#f0f2f5] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
                placeholder="Tell us what happened"
              />
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-[#667781]">
              <input
                type="checkbox"
                checked={reportBlock}
                onChange={(e) => setReportBlock(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#1a8c7a] focus:ring-[#1a8c7a]"
              />
              Also block this user
            </label>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setReportMessageId(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-[#667781]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReportMessage(reportMessageId)}
                className="flex-1 rounded-xl bg-[#EA3736] px-4 py-2 text-sm font-medium text-white"
              >
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
