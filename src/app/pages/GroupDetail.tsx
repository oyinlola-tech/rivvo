import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { Copy, Shield, Lock, Globe, UserPlus, MessageCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getOrCreateKeyPair,
  importPrivateKey,
  importPublicKey,
  deriveSharedKey,
  generateGroupKey,
  exportRawKey,
  encryptMessage,
} from "../lib/crypto";

interface Member {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending";
}

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [error, setError] = useState("");
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [handleValue, setHandleValue] = useState("");
  const [handleEditing, setHandleEditing] = useState(false);
  const [handleSaving, setHandleSaving] = useState(false);
  const [handleError, setHandleError] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ version: number; hasKey: boolean }>({
    version: 1,
    hasKey: false,
  });
  const [keyRotateLoading, setKeyRotateLoading] = useState(false);
  const [keyRotateError, setKeyRotateError] = useState("");
  const autoRotateAttemptedRef = useRef(false);

  const loadAll = async () => {
    if (!groupId) return;
    setError("");
    const [groupResp, membersResp, requestsResp] = await Promise.all([
      api.getGroup(groupId),
      api.listGroupMembers(groupId),
      api.listJoinRequests(groupId),
    ]);
    if (groupResp.success) {
      setGroup(groupResp.data);
      if (groupResp.data?.keyVersion) {
        setKeyStatus((prev) => ({ ...prev, version: Number(groupResp.data.keyVersion || 1) }));
      }
    }
    if (membersResp.success) {
      setMembers(membersResp.data);
    }
    if (requestsResp.success) {
      setRequests(requestsResp.data);
    }
    if (!groupResp.success) {
      setError(groupResp.error || "Failed to load group");
    }
    if (groupResp.success && groupResp.data?.membership?.status === "active") {
      const keyResp = await api.getGroupKey(groupId);
      if (keyResp.success && keyResp.data) {
        setKeyStatus({
          version: Number(keyResp.data.version || groupResp.data?.keyVersion || 1),
          hasKey: Boolean(keyResp.data.wrappedKey),
        });
      }
    }
  };

  useEffect(() => {
    loadAll();
  }, [groupId]);

  useEffect(() => {
    if (group?.handle !== undefined && group?.handle !== null) {
      setHandleValue(group.handle);
    } else {
      setHandleValue("");
    }
  }, [group?.handle]);

  if (!groupId) return null;

  const membership = group?.membership;
  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const canInvite = group?.isPrivate ? isAdmin : Boolean(membership?.status === "active");
  const memberIds = new Set(members.map((member) => member.id));
  const canViewMembers = group ? (!group.isPrivate || isAdmin) : false;

  useEffect(() => {
    if (!groupId) return;
    if (!isAdmin) return;
    if (keyStatus.hasKey) return;
    if (keyRotateLoading) return;
    if (autoRotateAttemptedRef.current) return;
    autoRotateAttemptedRef.current = true;
    handleRotateGroupKey();
  }, [groupId, isAdmin, keyStatus.hasKey, keyRotateLoading]);

  const handleCreateInvite = async () => {
    const response = await api.createGroupInvite(groupId);
    if (response.success && response.data?.token) {
      const slug = encodeURIComponent(group?.name || "group");
      const link = `${window.location.origin}/invite/${slug}/${response.data.token}`;
      setInviteLink(link);
      await navigator.clipboard.writeText(link);
    } else if (!response.success) {
      setError(response.error || "Failed to create invite");
    }
  };

  const handleOpenChat = () => {
    if (group?.conversationId) {
      navigate(`/messages/${group.conversationId}`);
      return;
    }
    setError("Group chat is not available yet");
  };

  const handleSearchMembers = async () => {
    const query = memberQuery.trim();
    if (!query) {
      setMemberResults([]);
      return;
    }
    setMemberLoading(true);
    setMemberError("");
    const response = await api.searchUsers(query);
    if (response.success && response.data) {
      setMemberResults(response.data);
    } else if (!response.success) {
      setMemberError(response.error || "Failed to search users");
    }
    setMemberLoading(false);
  };

  const handleAddMember = async (memberId: string) => {
    if (!groupId) return;
    setAddingMemberId(memberId);
    setMemberError("");
    const response = await api.addGroupMember(groupId, memberId);
    if (response.success) {
      await loadAll();
    } else if (!response.success) {
      setMemberError(response.error || "Failed to add member");
    }
    setAddingMemberId(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!groupId) return;
    setError("");
    const response = await api.removeGroupMember(groupId, memberId);
    if (response.success) {
      await loadAll();
    } else if (!response.success) {
      setError(response.error || "Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId) return;
    setError("");
    const response = await api.leaveGroup(groupId);
    if (response.success) {
      navigate("/groups");
    } else if (!response.success) {
      setError(response.error || "Failed to leave group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    const confirmed = window.confirm("Delete this group? This action cannot be undone.");
    if (!confirmed) return;
    setDeleteLoading(true);
    setError("");
    const response = await api.deleteGroup(groupId);
    if (response.success) {
      navigate("/groups");
    } else if (!response.success) {
      setError(response.error || "Failed to delete group");
    }
    setDeleteLoading(false);
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!groupId) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const response = await api.uploadGroupAvatar(groupId, file);
    if (response.success && response.data?.avatar) {
      setGroup((prev: any) => ({ ...prev, avatar: response.data.avatar }));
    } else if (!response.success) {
      setError(response.error || "Failed to upload avatar");
    }
    setAvatarUploading(false);
    event.target.value = "";
  };

  const handleBannerChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!groupId) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    const response = await api.uploadGroupBanner(groupId, file);
    if (response.success && response.data?.banner) {
      setGroup((prev: any) => ({ ...prev, banner: response.data.banner }));
    } else if (!response.success) {
      setError(response.error || "Failed to upload banner");
    }
    setBannerUploading(false);
    event.target.value = "";
  };

  const handleSaveHandle = async () => {
    if (!groupId) return;
    setHandleSaving(true);
    setHandleError("");
    const trimmed = handleValue.trim();
    const response = await api.updateGroupHandle(groupId, trimmed ? trimmed : null);
    if (response.success) {
      setGroup((prev: any) => ({ ...prev, handle: response.data?.handle ?? null }));
      setHandleEditing(false);
    } else if (!response.success) {
      setHandleError(response.error || "Failed to update handle");
    }
    setHandleSaving(false);
  };

  const handleRotateGroupKey = async () => {
    if (!groupId) return;
    setKeyRotateLoading(true);
    setKeyRotateError("");
    const membersResp = await api.getGroupKeyMembers(groupId);
    if (!membersResp.success || !membersResp.data?.members?.length) {
      setKeyRotateError(membersResp.error || "Unable to load members for rotation");
      setKeyRotateLoading(false);
      return;
    }
    const missingKeys = membersResp.data.members.filter((member) => !member.publicKey);
    if (missingKeys.length) {
      setKeyRotateError("Some members are missing encryption keys.");
      setKeyRotateLoading(false);
      return;
    }

    const keyPair = await getOrCreateKeyPair();
    const privateKey = await importPrivateKey(keyPair.privateKey);
    const groupKey = await generateGroupKey();
    const rawKey = await exportRawKey(groupKey);

    const shares = await Promise.all(
      membersResp.data.members.map(async (member) => {
        if (!member.publicKey) return null;
        const memberPublic = await importPublicKey(JSON.parse(member.publicKey));
        const derived = await deriveSharedKey(privateKey, memberPublic);
        const wrapped = await encryptMessage(rawKey, derived);
        return {
          userId: member.userId,
          wrappedKey: wrapped.ciphertext,
          wrappedKeyIv: wrapped.iv,
          senderPublicKey: JSON.stringify(keyPair.publicKey),
        };
      })
    );
    const validShares = shares.filter(Boolean) as {
      userId: string;
      wrappedKey: string;
      wrappedKeyIv: string;
      senderPublicKey: string;
    }[];

    const rotateResp = await api.rotateGroupKey(groupId, membersResp.data.version, validShares);
    if (!rotateResp.success) {
      setKeyRotateError(rotateResp.error || "Failed to rotate group key");
      setKeyRotateLoading(false);
      return;
    }
    setKeyStatus({ version: membersResp.data.version, hasKey: true });
    setKeyRotateLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    const response = await api.approveJoin(groupId, requestId);
    if (response.success) {
      await loadAll();
    } else if (!response.success) {
      setError(response.error || "Failed to approve request");
    }
  };

  const handleReject = async (requestId: string) => {
    const response = await api.rejectJoin(groupId, requestId);
    if (response.success) {
      await loadAll();
    } else if (!response.success) {
      setError(response.error || "Failed to reject request");
    }
  };

  const handlePromote = async (memberId: string) => {
    const response = await api.promoteGroupAdmin(groupId, memberId);
    if (response.success) {
      await loadAll();
    } else if (!response.success) {
      setError(response.error || "Failed to promote admin");
    }
  };

  const handleDemote = async (memberId: string) => {
    const response = await api.demoteGroupAdmin(groupId, memberId);
    if (response.success) {
      await loadAll();
    } else if (!response.success) {
      setError(response.error || "Failed to demote admin");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#1a8c7a] md:ml-64">
      <div className="bg-[#1a8c7a] sticky top-0 z-10 px-6 pt-5 pb-4 border-b border-white/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center font-semibold ring-2 ring-white/30">
              {(group?.name || "G").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">{group?.name || "Group"}</h1>
              {group?.handle && (
                <p className="text-xs text-white/60">@{group.handle}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    group?.isPrivate ? "bg-white/10 text-white/90" : "bg-[#1a8c7a] text-white"
                  }`}
                >
                  {group?.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                  {group?.isPrivate ? "Private" : "Public"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                  E2E {keyStatus.hasKey ? `v${keyStatus.version}` : "pending"}
                </span>
                <span>{group?.isPrivate ? "Invite only" : "Open to all"}</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowMemberPicker(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-white text-xs hover:bg-white/15"
              >
                <UserPlus size={14} /> Add members
              </button>
            )}
            <button
              onClick={handleOpenChat}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-white text-xs hover:bg-white/15"
            >
              <MessageCircle size={14} /> Open chat
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#f0f2f5] rounded-t-[32px] min-h-[calc(100dvh-120px)] pt-6">
        {error && (
          <div className="mx-6 mb-4 rounded-2xl border border-[#1a8c7a]/20 bg-[#1a8c7a]/10 px-4 py-3 text-sm text-[#1a8c7a]">
            {error}
          </div>
        )}

        <div className="px-6 mb-6">
          <div className="relative overflow-hidden rounded-3xl bg-[#0f1a20] shadow-sm border border-black/5">
            {group?.banner ? (
              <img
                src={group.banner}
                alt={`${group?.name || "Group"} banner`}
                className="h-28 w-full object-cover"
              />
            ) : (
              <div className="h-28 w-full bg-[radial-gradient(circle_at_top,_rgba(26,140,122,0.4),_transparent_60%),linear-gradient(135deg,_#0f1a20,_#1f2d33)]" />
            )}
            <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-full bg-[#1a8c7a]/20 text-white flex items-center justify-center font-semibold shadow-lg overflow-hidden ring-2 ring-white">
              {group?.avatar ? (
                <img
                  src={group.avatar}
                  alt={`${group?.name || "Group"} avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                (group?.name || "G").slice(0, 1).toUpperCase()
              )}
            </div>
            {isAdmin && (
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  className="px-3 py-1 rounded-full bg-black/40 text-white text-xs backdrop-blur"
                  disabled={bannerUploading}
                >
                  {bannerUploading ? "Uploading..." : "Change banner"}
                </button>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3 py-1 rounded-full bg-black/40 text-white text-xs backdrop-blur"
                  disabled={avatarUploading}
                >
                  {avatarUploading ? "Uploading..." : "Change avatar"}
                </button>
              </div>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="mt-10 bg-white rounded-3xl border border-black/5 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#111b21]">About</h2>
                <p className="text-sm text-[#667781] mt-1">{group?.description || "No description"}</p>
              </div>
              <div className="text-xs text-[#667781]">
                {group?.isPrivate ? "Private group" : "Public group"}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-[#667781]">Handle</span>
              {handleEditing && isAdmin ? (
                <div className="flex items-center gap-2">
                  <input
                    className="px-3 py-1 border border-black/10 rounded-full text-xs bg-white"
                    placeholder="groupname"
                    value={handleValue}
                    onChange={(e) => setHandleValue(e.target.value)}
                  />
                  <button
                    onClick={handleSaveHandle}
                    className="px-3 py-1 rounded-full bg-[#1a8c7a] text-white text-xs"
                    disabled={handleSaving}
                  >
                    {handleSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setHandleEditing(false);
                      setHandleValue(group?.handle || "");
                      setHandleError("");
                    }}
                    className="px-3 py-1 rounded-full border border-black/10 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#111b21]">
                    {group?.handle ? `@${group.handle}` : "Not set"}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setHandleEditing(true)}
                      className="text-xs px-2 py-0.5 rounded-full border border-black/10"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
            {handleError && <p className="text-xs text-[#1a8c7a] mt-2">{handleError}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setShowMembers(true)}
                className="text-xs text-[#1a8c7a] underline-offset-4 hover:underline"
              >
                View members
              </button>
              {group?.handle && (
                <span className="text-xs text-[#667781]">• /g/{group.handle}</span>
              )}
            </div>
            {keyRotateError && <p className="text-xs text-[#1a8c7a] mt-2">{keyRotateError}</p>}
          </div>
        </div>

        <div className="px-6 mb-4 sm:hidden flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowMemberPicker(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-white border border-black/10 text-[#111b21] text-sm"
            >
              <UserPlus size={16} /> Add members
            </button>
          )}
          <button
            onClick={handleOpenChat}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-[#1a8c7a] text-white text-sm"
          >
            <MessageCircle size={16} /> Open chat
          </button>
        </div>

        {canInvite && (
          <div className="px-6 mb-6">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleCreateInvite}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a8c7a] text-white text-sm"
              >
                <Copy size={16} /> Generate invite link
              </button>
              {inviteLink && (
                <p className="text-xs text-[#667781] break-all">{inviteLink}</p>
              )}
            </div>
          </div>
        )}

        <div className="px-6 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-2">
              {group?.isPrivate ? (
                <Lock size={16} className="text-[#1a8c7a]" />
              ) : (
                <Globe size={16} className="text-[#1a8c7a]" />
              )}
              <h3 className="font-semibold text-[#111b21]">
                {group?.isPrivate ? "Private info" : "Public info"}
              </h3>
            </div>
            {group?.isPrivate ? (
              <ul className="text-sm text-[#667781] list-disc pl-4">
                <li>Only admins can invite members.</li>
                <li>Join requests need approval.</li>
                <li>Group visibility is hidden from search.</li>
              </ul>
            ) : (
              <ul className="text-sm text-[#667781] list-disc pl-4">
                <li>Anyone can discover and join.</li>
                <li>Invite link lets friends join quickly.</li>
                <li>Group is visible in public search.</li>
              </ul>
            )}
          </div>
        </div>

        {group?.isPrivate && isAdmin && (
          <div className="px-6 mb-6">
            <h3 className="font-semibold mb-2 text-[#111b21]">Join Requests</h3>
            {requests.length === 0 ? (
              <p className="text-sm text-[#667781]">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-black/5">
                    <div>
                      <p className="font-medium text-[#111b21]">{req.name}</p>
                      <p className="text-xs text-[#667781]">{req.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-3 py-1 rounded-full bg-[#1a8c7a] text-white text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1 rounded-full border border-black/10 text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showMembers ? (
          canViewMembers ? (
          <div className="px-6 pb-10">
            <h3 className="font-semibold mb-2 text-[#111b21]">Members</h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-black/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e7f6f3] text-[#0a5c50] flex items-center justify-center text-sm font-semibold">
                      {(member.name || "M").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[#111b21]">{member.name}</p>
                      <p className="text-xs text-[#667781]">
                        {member.username ? `@${member.username}` : member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#f0f2f5] text-[#667781]">
                      {member.role}
                    </span>
                    {isOwner && member.role === "member" && (
                      <button
                        onClick={() => handlePromote(member.id)}
                        className="text-xs px-2 py-1 rounded-full border border-black/10 flex items-center gap-1"
                      >
                        <Shield size={12} /> Make admin
                      </button>
                    )}
                    {isOwner && member.role === "admin" && (
                      <button
                        onClick={() => handleDemote(member.id)}
                        className="text-xs px-2 py-1 rounded-full border border-black/10"
                      >
                        Remove admin
                      </button>
                    )}
                    {isAdmin && member.role !== "owner" && member.id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-xs px-2 py-1 rounded-full border border-black/10 text-[#111b21]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          ) : (
          <div className="px-6 pb-10">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 text-sm text-[#667781]">
              Members are visible to group admins and owners only.
            </div>
          </div>
          )
        ) : null}
        {membership?.status === "active" && membership?.role !== "owner" && (
          <div className="px-6 pb-10">
            <button
              onClick={handleLeaveGroup}
              className="w-full px-4 py-2 rounded-full border border-black/10 text-[#111b21] bg-white"
            >
              Leave group
            </button>
          </div>
        )}
        {membership?.status === "active" && membership?.role === "owner" && (
          <div className="px-6 pb-10">
            <button
              onClick={handleDeleteGroup}
              disabled={deleteLoading}
              className="w-full px-4 py-2 rounded-full border border-black/10 text-[#111b21] bg-white disabled:opacity-60"
            >
              {deleteLoading ? "Deleting..." : "Delete group"}
            </button>
          </div>
        )}
      </div>

      {showMemberPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#111b21]">Add members</h3>
              <button
                onClick={() => {
                  setShowMemberPicker(false);
                  setMemberQuery("");
                  setMemberResults([]);
                  setMemberError("");
                }}
                className="text-xs text-[#667781]"
              >
                Close
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 px-3 py-2 border border-black/10 rounded-xl"
                placeholder="Search by name or email"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchMembers()}
              />
              <button
                onClick={handleSearchMembers}
                className="px-3 py-2 rounded-xl bg-[#1a8c7a] text-white text-sm"
              >
                Search
              </button>
            </div>
            {memberError && <p className="text-xs text-[#1a8c7a] mb-2">{memberError}</p>}
            {memberLoading ? (
              <div className="py-6 text-center text-sm text-[#667781]">Searching...</div>
            ) : memberResults.length === 0 ? (
              <div className="py-6 text-center text-sm text-[#667781]">No results</div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {memberResults.map((user) => {
                  const alreadyMember = memberIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between border border-black/5 rounded-xl px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#111b21]">{user.name}</p>
                        <p className="text-xs text-[#667781]">
                          {user.username ? `@${user.username}` : user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddMember(user.id)}
                        disabled={alreadyMember || addingMemberId === user.id}
                        className={`text-xs px-3 py-1 rounded-full ${
                          alreadyMember
                            ? "bg-[#f0f2f5] text-[#667781]"
                            : "bg-[#1a8c7a] text-white"
                        }`}
                      >
                        {alreadyMember
                          ? "Added"
                          : addingMemberId === user.id
                          ? "Adding..."
                          : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

