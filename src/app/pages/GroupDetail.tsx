import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { api } from "../lib/api";
import { Copy, Shield } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending";
}

export default function GroupDetail() {
  const { groupId } = useParams();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [error, setError] = useState("");

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
    <div className="min-h-[100dvh] bg-[#111b21] md:ml-64">
      <div className="bg-[#111b21] sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">{group?.name || "Group"}</h1>
        <p className="text-sm text-white/70">{group?.isPrivate ? "Private" : "Public"}</p>
      </div>

      <div className="bg-background rounded-t-[40px] min-h-[calc(100dvh-120px)] pt-6">
        {error && <p className="px-6 text-red-600 text-sm">{error}</p>}

        <div className="px-6 mb-6">
          <h2 className="font-semibold mb-1">About</h2>
          <p className="text-sm text-gray-600">{group?.description || "No description"}</p>
        </div>

        {canInvite && (
          <div className="px-6 mb-6">
            <button
              onClick={handleCreateInvite}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white"
            >
              <Copy size={16} /> Generate invite link
            </button>
            {inviteLink && (
              <p className="mt-2 text-xs text-gray-600 break-all">{inviteLink}</p>
            )}
          </div>
        )}

        {group?.isPrivate && isAdmin && (
          <div className="px-6 mb-6">
            <h3 className="font-semibold mb-2">Join Requests</h3>
            {requests.length === 0 ? (
              <p className="text-sm text-gray-500">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{req.name}</p>
                      <p className="text-xs text-gray-500">{req.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-3 py-1 rounded-lg bg-[#25D366] text-white text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1 rounded-lg border text-sm"
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
          <h3 className="font-semibold mb-2">Members</h3>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                    {member.role}
                  </span>
                  {isOwner && member.role === "member" && (
                    <button
                      onClick={() => handlePromote(member.id)}
                      className="text-xs px-2 py-1 rounded-lg border flex items-center gap-1"
                    >
                      <Shield size={12} /> Make admin
                    </button>
                  )}
                  {isOwner && member.role === "admin" && (
                    <button
                      onClick={() => handleDemote(member.id)}
                      className="text-xs px-2 py-1 rounded-lg border"
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
    </div>
  );
}



