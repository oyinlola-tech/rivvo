import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, UserX } from "lucide-react";
import { api } from "../../lib/api";
import { VerificationBadge } from "../../components/VerificationBadge";

interface User {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  isVerifiedBadge: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  createdAt: string;
  status: "active" | "suspended";
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setError("");
    const response = await api.getUsers();
    if (response.success && response.data) {
      const nextUsers = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data.users)
          ? response.data.users
          : [];
      setUsers(nextUsers);
    } else if (!response.success) {
      setError(response.error || "Failed to load users");
    }
    setLoading(false);
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    const response = await api.updateVerification(userId, !currentStatus);
    if (response.success) {
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, verified: !currentStatus } : user
        )
      );
    } else if (!response.success) {
      setError(response.error || "Failed to update verification");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    const response = await api.deleteUser(userId);
    if (response.success) {
      setUsers(users.filter((user) => user.id !== userId));
    } else if (!response.success) {
      setError(response.error || "Failed to delete user");
    }
  };

  const handleToggleStatus = async (userId: string, status: "active" | "suspended") => {
    const next = status === "active" ? "suspended" : "active";
    const confirmAction = window.confirm(
      next === "suspended" ? "Ban this user?" : "Unban this user?"
    );
    if (!confirmAction) return;
    const response = await api.updateUserStatus(userId, next);
    if (response.success) {
      setUsers(users.map((user) => (user.id === userId ? { ...user, status: next } : user)));
    } else if (!response.success) {
      setError(response.error || "Failed to update user status");
    }
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#1a8c7a] text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Admin</p>
          <h1 className="text-2xl font-semibold">Users</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e6e6] overflow-hidden">
          <div className="p-6 border-b border-[#eef0f2]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a98a0]" size={20} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#f7f9fa] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]/30"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a8c7a]"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-[#eef0f2]">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-[#1a8c7a] flex items-center justify-center text-white font-bold">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name}</span>
                          {(user.isVerifiedBadge || user.isModerator || user.isAdmin) && (
                            <VerificationBadge
                              type={user.isModerator || user.isAdmin ? "staff" : "user"}
                              size="sm"
                            />
                          )}
                        </div>
                        <p className="text-xs text-[#7a8a93]">{user.email}</p>
                      </div>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        className="text-[#5f6d75] hover:text-[#1a8c7a]"
                        title={user.status === "active" ? "Ban user" : "Unban user"}
                      >
                        <UserX size={18} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-[#5f6d75] mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
                          user.status === "active"
                            ? "bg-[#dff7ea] text-[#0f5f4c]"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.status}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#f0f2f5]">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleToggleVerification(user.id, user.verified)}
                        className="inline-flex items-center gap-2 text-sm text-[#1a8c7a]"
                      >
                        {user.verified ? (
                          <CheckCircle size={18} className="text-[#1a8c7a]" />
                        ) : (
                          <XCircle size={18} className="text-[#c7d0d6]" />
                        )}
                        {user.verified ? "Verified" : "Unverified"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                <thead className="bg-[#f7f9fa] border-b border-[#eef0f2]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#7a8a93]">User</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#7a8a93]">Email</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#7a8a93]">Status</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#7a8a93]">Verified</th>
                    <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#7a8a93]">Joined</th>
                    <th className="px-6 py-4 text-right text-xs uppercase tracking-wider text-[#7a8a93]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef0f2]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#f7f9fa]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1a8c7a] flex items-center justify-center text-white font-bold">
                            {user.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.name}</span>
                              {(user.isVerifiedBadge || user.isModerator || user.isAdmin) && (
                                <VerificationBadge
                                  type={user.isModerator || user.isAdmin ? "staff" : "user"}
                                  size="sm"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#5f6d75]">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === "active"
                              ? "bg-[#dff7ea] text-[#0f5f4c]"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleVerification(user.id, user.verified)}
                          className="flex items-center gap-2"
                        >
                          {user.verified ? (
                            <CheckCircle size={20} className="text-[#1a8c7a]" />
                          ) : (
                            <XCircle size={20} className="text-[#c7d0d6]" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#5f6d75]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className="mr-4 text-[#5f6d75] hover:text-[#1a8c7a]"
                          title={user.status === "active" ? "Ban user" : "Unban user"}
                        >
                          <UserX size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


