import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { api } from "../lib/api";
import { toast } from "sonner";
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
  CheckCircle,
  Sparkles,
} from "lucide-react";

export default function Settings() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileUsername, setProfileUsername] = useState(user?.username || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [pricing, setPricing] = useState<{ amount: number | null; currency: string | null; active: boolean } | null>(null);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; eligibleAt: string | null } | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    latestPending: { status: string; reviewStatus: string; rejectionReason: string | null; createdAt: string | null } | null;
    latestDecision: { status: string; reviewStatus: string; rejectionReason: string | null; createdAt: string | null } | null;
  } | null>(null);
  const [showVerificationNotice, setShowVerificationNotice] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const apiBase = import.meta.env.VITE_API_URL;
  const mediaBase = apiBase.replace(/\/api\/?$/, "");
  const avatarSrc = avatarUrl ? `${mediaBase}${avatarUrl}` : "";
  const missingVerificationProfile = !user?.phone || !user?.username;
  const renewalWindowOpen = (() => {
    if (!user?.verifiedBadgeExpiresAt) return false;
    const expiresAt = new Date(user.verifiedBadgeExpiresAt);
    const windowStart = new Date(expiresAt);
    windowStart.setDate(windowStart.getDate() - 7);
    const now = new Date();
    return now >= windowStart && now <= expiresAt;
  })();
  const verificationLocked = Boolean(user?.isVerifiedBadge || verificationStatus?.latestPending);

  useEffect(() => {
    setAvatarUrl(user?.avatar || "");
    setProfileName(user?.name || "");
    setProfileUsername(user?.username || "");
    setProfilePhone(user?.phone || "");
  }, [user?.avatar, user?.name, user?.username, user?.phone]);

  useEffect(() => {
    let mounted = true;
    const loadVerification = async () => {
      const [pricingResponse, eligibilityResponse, statusResponse] = await Promise.all([
        api.getVerificationPricing(),
        api.getVerificationEligibility(),
        api.getVerificationStatus(),
      ]);
      if (!mounted) return;
      if (pricingResponse.success && pricingResponse.data) {
        setPricing(pricingResponse.data);
      }
      if (eligibilityResponse.success && eligibilityResponse.data) {
        setEligibility(eligibilityResponse.data);
      }
      if (statusResponse.success && statusResponse.data) {
        setVerificationStatus(statusResponse.data);
        if (statusResponse.data.latestDecision?.reviewStatus === "approved" && !user?.isVerifiedBadge) {
          await refreshProfile();
        }
      }
    };
    loadVerification();
    const interval = window.setInterval(loadVerification, 60000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [refreshProfile, user?.isVerifiedBadge]);

  useEffect(() => {
    if (verificationStatus?.latestPending) {
      const shownKey = "rivvo_verification_pending_toast";
      if (!sessionStorage.getItem(shownKey)) {
        toast("Verification pending review", {
          description: "Payment received. Admin review in progress.",
        });
        sessionStorage.setItem(shownKey, "1");
      }
    }
  }, [verificationStatus?.latestPending]);

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

  const handleCreateInvite = async () => {
    const response = await api.createUserInvite();
    if (response.success && response.data?.token) {
      const link = `${window.location.origin}/invite/user/${response.data.token}`;
      setInviteLink(link);
      await navigator.clipboard.writeText(link);
    }
  };

  const handleProfileSave = async () => {
    setProfileError("");
    setProfileSaving(true);
    const payload: Record<string, string | null> = {
      name: profileName.trim(),
      username: profileUsername.trim() ? profileUsername.trim() : null,
      phone: profilePhone.trim() ? profilePhone.trim() : null,
    };
    if (user?.username && !payload.username) {
      const confirmUnset = window.confirm(
        "Remove your username? This may affect verification eligibility."
      );
      if (!confirmUnset) {
        setProfileSaving(false);
        return;
      }
    }
    if (user?.phone && !payload.phone) {
      const confirmUnset = window.confirm(
        "Remove your phone number? This may affect verification eligibility."
      );
      if (!confirmUnset) {
        setProfileSaving(false);
        return;
      }
    }
    const response = await api.updateProfile(payload);
    if (response.success) {
      await refreshProfile();
      toast("Profile updated");
    } else {
      setProfileError(response.error || "Failed to update profile");
    }
    setProfileSaving(false);
  };

  const handleVerificationCheckout = async () => {
    setVerificationError("");
    setCheckoutLoading(true);
    const response = await api.createVerificationCheckout();
    if (response.success && response.data?.link) {
      window.open(response.data.link, "_blank", "noopener,noreferrer");
    } else {
      setVerificationError(response.error || "Unable to start verification checkout");
    }
    setCheckoutLoading(false);
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
          <div className="mt-6 grid gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-4 py-3 bg-[#F3F6F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20A090]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#F3F6F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20A090]"
                placeholder="@username"
                disabled={verificationLocked}
              />
              {verificationLocked && (
                <p className="text-xs text-[#797c7b] mt-1">
                  Username can’t be removed while verification is active or pending review.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-4 py-3 bg-[#F3F6F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#20A090]"
                placeholder="+234..."
                disabled={verificationLocked}
              />
              {verificationLocked && (
                <p className="text-xs text-[#797c7b] mt-1">
                  Phone number can’t be removed while verification is active or pending review.
                </p>
              )}
            </div>
            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="px-4 py-3 rounded-xl bg-[#20A090] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
            {profileError && <p className="text-sm text-red-600">{profileError}</p>}
          </div>
          <div className="mt-4">
            <button
              onClick={handleCreateInvite}
              className="px-4 py-2 rounded-lg bg-[#20A090] text-white"
            >
              Create profile link
            </button>
            {inviteLink && (
              <p className="mt-2 text-xs text-gray-600 break-all">{inviteLink}</p>
            )}
          </div>
        </div>

        {/* Verification */}
        <div className="px-6 mb-6">
          <div className="rounded-2xl border border-gray-100 bg-[#F8FBFA] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-[#1DA1F2] flex items-center justify-center">
                <CheckCircle size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#000e08]">Get Verified</h3>
                <p className="text-sm text-[#797c7b]">Stand out with a verified checkmark</p>
              </div>
            </div>

            <div className="grid gap-2 text-sm text-[#4A4F4E] mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#20A090]" />
                <span>Boost trust with new connections</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#20A090]" />
                <span>Increase message response rates</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#20A090]" />
                <span>Monthly renewal keeps your badge active</span>
              </div>
            </div>

            {user?.isVerifiedBadge ? (
              <>
                <div className="text-sm text-[#1a8c7a] font-medium mb-3">
                  Active badge{user.verifiedBadgeExpiresAt
                    ? ` - Renews on ${new Date(user.verifiedBadgeExpiresAt).toLocaleDateString()}`
                    : ""}
                </div>
                {renewalWindowOpen && (
                  <button
                    onClick={handleVerificationCheckout}
                    disabled={checkoutLoading || !pricing?.active || missingVerificationProfile}
                    className="w-full py-3 rounded-xl font-medium bg-[#1DA1F2] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? "Opening checkout..." : "Renew verification"}
                  </button>
                )}
                {missingVerificationProfile && (
                  <p className="text-xs text-[#797c7b] mt-2">
                    Add a username and phone number in your profile to renew verification.
                  </p>
                )}
                {!renewalWindowOpen && (
                  <p className="text-xs text-[#797c7b]">
                    Renewal opens 7 days before expiry.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-[#797c7b]">
                    {pricing?.active ? (
                      <>
                        Price:{" "}
                        <span className="font-semibold text-[#000e08]">
                          {pricing.amount?.toLocaleString()} {pricing.currency}
                        </span>
                        <span className="text-xs text-[#797c7b]"> / month</span>
                      </>
                    ) : (
                      "Verification pricing unavailable"
                    )}
                  </div>
                  {eligibility?.eligibleAt && !eligibility?.eligible && (
                    <div className="text-xs text-[#797c7b]">
                      Available on {new Date(eligibility.eligibleAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleVerificationCheckout}
                  disabled={
                    checkoutLoading ||
                    !pricing?.active ||
                    !eligibility?.eligible ||
                    missingVerificationProfile ||
                    Boolean(verificationStatus?.latestPending)
                  }
                  className="w-full py-3 rounded-xl font-medium bg-[#1DA1F2] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading
                    ? "Opening checkout..."
                    : verificationStatus?.latestPending
                      ? "Pending review"
                      : "Buy verification"}
                </button>
                {verificationError && (
                  <p className="text-sm text-red-600 mt-2">{verificationError}</p>
                )}
                {missingVerificationProfile && (
                  <p className="text-xs text-[#797c7b] mt-2">
                    Add a username and phone number in your profile to buy verification.
                  </p>
                )}
                {!eligibility?.eligible && (
                  <p className="text-xs text-[#797c7b] mt-2">
                    Checkmark becomes available after 3 months on Rivvo.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {showVerificationNotice &&
          verificationStatus?.latestDecision &&
          verificationStatus.latestDecision.reviewStatus !== "pending" && (
          <div className="px-6 mb-6">
            <div
              className={`rounded-2xl border p-4 ${
                verificationStatus.latestDecision.reviewStatus === "approved"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : verificationStatus.latestDecision.reviewStatus === "rejected"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-yellow-200 bg-yellow-50 text-yellow-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {verificationStatus.latestDecision.reviewStatus === "approved" && (
                    <p className="font-medium">Verification approved.</p>
                  )}
                  {verificationStatus.latestDecision.reviewStatus === "rejected" && (
                    <>
                      <p className="font-medium">Verification rejected.</p>
                      {verificationStatus.latestDecision.rejectionReason && (
                        <p className="text-sm mt-1">
                          Reason: {verificationStatus.latestDecision.rejectionReason}
                        </p>
                      )}
                    </>
                  )}
                  {verificationStatus.latestDecision.reviewStatus === "pending" && (
                    <p className="font-medium">Verification is under review.</p>
                  )}
                </div>
                <button
                  onClick={() => setShowVerificationNotice(false)}
                  className="text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checkmark Legend */}
        <div className="px-6 mb-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h4 className="text-sm font-semibold text-[#000e08] mb-2">Checkmark Legend</h4>
            <div className="flex items-center gap-3 text-sm text-[#797c7b]">
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#1DA1F2]">
                  <CheckCircle size={10} className="text-white" />
                </span>
                Verified user
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-black">
                  <CheckCircle size={10} className="text-white" />
                </span>
                Staff (moderators/admins)
              </span>
            </div>
          </div>
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

