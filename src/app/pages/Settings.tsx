import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { api } from "../lib/api";
import {
  User,
  Bell,
  Lock,
  HelpCircle,
  Database,
  UserPlus,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const mediaBase = apiBase.replace(/\/api\/?$/, "");
  const avatarSrc = avatarUrl ? `${mediaBase}${avatarUrl}` : "";

  useEffect(() => {
    setAvatarUrl(user?.avatar || "");
  }, [user?.avatar]);

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    const response = await api.uploadAvatar(avatarFile);
    if (response.success && response.data?.avatar) {
      setAvatarUrl(response.data.avatar);
      setAvatarFile(null);
      setAvatarError("");
    } else {
      setAvatarError(response.error || "Failed to upload avatar");
    }
  };

  const settingsGroups = [
    {
      items: [
        {
          icon: User,
          label: "Account",
          description: "Privacy, security, change number",
          onClick: () => {},
        },
        {
          icon: Bell,
          label: "Notifications",
          description: "Messages, group and others",
          onClick: () => {},
        },
        {
          icon: Lock,
          label: "Device verification",
          description: "Verify keys and devices",
          onClick: () => navigate("/settings/device-keys"),
        },
      ],
    },
    {
      items: [
        {
          icon: Moon,
          label: "Dark Mode",
          description: theme === "dark" ? "Enabled" : "Disabled",
          onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
          hasToggle: true,
        },
        {
          icon: HelpCircle,
          label: "Help",
          description: "Help center, contact us, privacy policy",
          onClick: () => {},
        },
        {
          icon: Database,
          label: "Storage and data",
          description: "Network usage, storage usage",
          onClick: () => {},
        },
        {
          icon: UserPlus,
          label: "Invite a friend",
          description: "Share RIVVO with friends",
          onClick: () => {},
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#000e08] md:ml-64">
      {/* Header */}
      <div className="bg-[#000e08] sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Settings Content */}
      <div className="bg-white dark:bg-white rounded-t-[40px] min-h-[calc(100vh-100px)] pt-6">
        {/* Profile Section */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#20A090] to-[#1a8c7a] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                user?.name[0].toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={handleAvatarUpload}
              className="px-4 py-2 rounded-lg bg-[#20A090] text-white"
            >
              Upload Photo
            </button>
          </div>
          {avatarError && <p className="text-sm text-red-600 mt-2">{avatarError}</p>}
        </div>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-4">
            {group.items.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <button
                  key={itemIndex}
                  onClick={item.onClick}
                  className="w-full px-6 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4 border-b border-gray-100"
                >
                  <div className="w-11 h-11 rounded-full bg-[#F2F8F7] flex items-center justify-center">
                    <Icon size={20} className="text-[#797C7B]" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#000e08]">{item.label}</h3>
                    <p className="text-sm text-[#797c7b]">{item.description}</p>
                  </div>
                  {item.hasToggle && (
                    <div
                      className={`w-12 h-6 rounded-full transition-colors ${
                        theme === "dark" ? "bg-[#20A090]" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${
                          theme === "dark" ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Logout Button */}
        <div className="px-6 mt-8 mb-24 md:mb-8">
          <button
            onClick={handleLogout}
            className="w-full bg-[#EA3736] text-white py-3 rounded-xl font-medium hover:bg-[#d32f2f] transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
