import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Phone, Video, Send, Paperclip, Mic, Camera } from "lucide-react";
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
} from "../lib/crypto";
import {
  getConversationSync,
  loadMessages as loadCachedMessages,
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
}

export default function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const contact = {
    name: "John Abraham",
    online: true,
    verified: true,
    isModerator: false,
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
        if (payload.message.encrypted && payload.message.iv && sharedKey) {
          try {
            const text = await decryptMessage(payload.message.text, payload.message.iv, sharedKey);
            nextMessage = { ...payload.message, text };
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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === "me" ? { ...msg, readAt: payload.readAt } : msg
        )
      );
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
    socket.on("typing", handleTyping);

    return () => {
      socket.emit("leave_conversation", { conversationId: id });
      socket.off("new_message", handleIncoming);
      socket.off("read_receipt", handleRead);
      socket.off("typing", handleTyping);
    };
  }, [id, sharedKey, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!id || !user?.id) return;
    const cached = await loadCachedMessages(user.id, id);
    if (cached.length) {
      setMessages(cached);
      setLoading(false);
    }

    let derivedKey: CryptoKey | null = null;
    const peerResponse = await api.getConversationPeer(id);
    if (peerResponse.success && peerResponse.data?.publicKey) {
      const keyPair = await getOrCreateKeyPair();
      const privateKey = await importPrivateKey(keyPair.privateKey);
      const peerPublic = await importPublicKey(JSON.parse(peerResponse.data.publicKey));
      derivedKey = await deriveSharedKey(privateKey, peerPublic);
      setSharedKey(derivedKey);
    }

    const lastSync = await getConversationSync(user.id, id);
    const response = await api.getMessages(id, {
      since: lastSync || undefined,
      markRead: true,
    });
    if (response.success && response.data?.messages) {
      const incoming = await Promise.all(
        response.data.messages.map(async (msg: Message) => {
          if (msg.encrypted && msg.iv && derivedKey) {
            try {
              const text = await decryptMessage(msg.text, msg.iv, derivedKey);
              return { ...msg, text };
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
      [...cached, ...incoming].forEach((msg) => mergedMap.set(msg.id, msg));
      const merged = Array.from(mergedMap.values()).sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp)
      );

      setMessages(merged);
      await saveMessages(user.id, id, incoming);
      if (response.data.serverTime) {
        await setConversationSync(user.id, id, response.data.serverTime);
      }
    }
    await api.markConversationRead(id);
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !id) return;

    const tempMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      timestamp: new Date().toISOString(),
      sender: "me",
      readAt: null,
    };

    setMessages([...messages, tempMessage]);
    setNewMessage("");
    if (user?.id) {
      saveMessages(user.id, id, [tempMessage]);
    }

    if (sharedKey) {
      const encrypted = await encryptMessage(newMessage, sharedKey);
      await api.sendEncryptedMessage(id, encrypted);
    } else {
      await api.sendMessage(id, newMessage);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white md:ml-64">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/")} className="md:hidden">
          <ArrowLeft size={24} />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white font-bold">
          {contact.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{contact.name}</h2>
            {contact.verified && (
              <VerificationBadge type={contact.isModerator ? "mod" : "user"} size="sm" />
            )}
          </div>
          <p className="text-xs text-gray-500">{contact.online ? "Active now" : "Offline"}</p>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <Phone size={20} />
          </button>
          <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <Video size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F1FAF9]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#20A090]"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    message.sender === "me"
                      ? "bg-[#20A090] text-white"
                      : "bg-white text-gray-900"
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "me" ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                    {message.sender === "me" && message.readAt ? " • Seen" : ""}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <Paperclip size={20} className="text-gray-600" />
          </button>
          <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <Camera size={20} className="text-gray-600" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Write your message"
            className="flex-1 px-4 py-2 bg-[#F3F6F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20A090]"
          />
          {newMessage.trim() ? (
            <button
              onClick={handleSend}
              className="w-10 h-10 rounded-full bg-[#20A090] flex items-center justify-center"
            >
              <Send size={20} className="text-white" />
            </button>
          ) : (
            <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
              <Mic size={20} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
