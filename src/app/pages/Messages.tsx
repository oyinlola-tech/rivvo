import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Phone, Video, Send, Paperclip, Mic, Camera } from "lucide-react";
import { api } from "../lib/api";
import { VerificationBadge } from "../components/VerificationBadge";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: "me" | "them";
}

export default function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!id) return;
    const response = await api.getMessages(id);
    if (response.success && response.data) {
      setMessages(response.data);
    }
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
    };

    setMessages([...messages, tempMessage]);
    setNewMessage("");

    await api.sendMessage(id, newMessage);
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
