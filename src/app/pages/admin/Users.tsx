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
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Users</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a8c7a]"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Verified</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Joined</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a8c7a] to-[#1a8c7a] flex items-center justify-center text-white font-bold">
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
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === "active"
                            ? "bg-green-100 text-green-800"
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
                          <CheckCircle size={20} className="text-green-500" />
                        ) : (
                          <XCircle size={20} className="text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        className="mr-4 text-gray-600 hover:text-gray-800"
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
        )}
      </div>
    </div>
  );
}


