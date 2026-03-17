import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { Copy, Shield, Lock, Globe, UserPlus, MessageCircle } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending";
}

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
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
  };

  useEffect(() => {
    loadAll();
  }, [groupId]);

  if (!groupId) return null;

  const membership = group?.membership;
  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const canInvite = group?.isPrivate ? isAdmin : Boolean(membership?.status === "active");
  const memberIds = new Set(members.map((member) => member.id));

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
    <div className="min-h-[100dvh] bg-[#0b141a] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#e7f6f3] text-[#0a5c50] flex items-center justify-center font-semibold">
              {(group?.name || "G").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">{group?.name || "Group"}</h1>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    group?.isPrivate ? "bg-white/10 text-white/90" : "bg-[#1a8c7a] text-white"
                  }`}
                >
                  {group?.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                  {group?.isPrivate ? "Private" : "Public"}
                </span>
                <span>{group?.isPrivate ? "Invite only" : "Open to all"}</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowMemberPicker(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-white text-xs"
              >
                <UserPlus size={14} /> Add members
              </button>
            )}
            <button
              onClick={handleOpenChat}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-white text-xs"
            >
              <MessageCircle size={14} /> Open chat
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#f0f2f5] rounded-t-[40px] min-h-[calc(100dvh-120px)] pt-6">
        {error && <p className="px-6 text-red-600 text-sm">{error}</p>}

        <div className="px-6 mb-6">
          <div className="relative overflow-hidden rounded-2xl bg-[#0f1a20]">
            <div className="h-28 w-full bg-[radial-gradient(circle_at_top,_rgba(26,140,122,0.4),_transparent_60%),linear-gradient(135deg,_#0f1a20,_#1f2d33)]" />
            <div className="absolute -bottom-6 left-6 w-14 h-14 rounded-full bg-[#e7f6f3] text-[#0a5c50] flex items-center justify-center font-semibold shadow-lg">
              {(group?.name || "G").slice(0, 1).toUpperCase()}
            </div>
          </div>
          <div className="mt-10">
            <h2 className="font-semibold mb-1 text-[#111b21]">About</h2>
            <p className="text-sm text-[#667781]">{group?.description || "No description"}</p>
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
            <button
              onClick={handleCreateInvite}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a8c7a] text-white text-sm"
            >
              <Copy size={16} /> Generate invite link
            </button>
            {inviteLink && (
              <p className="mt-2 text-xs text-[#667781] break-all">{inviteLink}</p>
            )}
          </div>
        )}

        <div className="px-6 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-2">
              {group?.isPrivate ? (
                <Lock size={16} className="text-[#a61f2a]" />
              ) : (
                <Globe size={16} className="text-[#0a5c50]" />
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
                  <div key={req.id} className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
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

        <div className="px-6 pb-10">
          <h3 className="font-semibold mb-2 text-[#111b21]">Members</h3>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e7f6f3] text-[#0a5c50] flex items-center justify-center text-sm font-semibold">
                    {(member.name || "M").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[#111b21]">{member.name}</p>
                    <p className="text-xs text-[#667781]">{member.email}</p>
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
                </div>
              </div>
            ))}
          </div>
        </div>
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
            {memberError && <p className="text-xs text-red-600 mb-2">{memberError}</p>}
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
                        <p className="text-xs text-[#667781]">{user.email}</p>
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




