import { useState, useEffect } from "react";
import { Plus, Shield } from "lucide-react";
import { api } from "../../lib/api";
import { VerificationBadge } from "../../components/VerificationBadge";

interface Moderator {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function AdminModerators() {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadModerators();
  }, []);

  const loadModerators = async () => {
    const response = await api.getModerators();
    if (response.success && response.data) {
      setModerators(response.data);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const response = await api.createModerator(formData);
    
    if (response.success) {
      setShowCreateForm(false);
      setFormData({ name: "", email: "", password: "" });
      loadModerators();
    }
    
    setCreateLoading(false);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Moderators</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#20A090] text-white rounded-lg hover:bg-[#1a8c7a] transition-colors"
        >
          <Plus size={20} />
          <span>Add Moderator</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Create Moderator</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#20A090]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#20A090]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#20A090]"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-[#20A090] text-white rounded-lg hover:bg-[#1a8c7a] transition-colors disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#20A090]"></div>
          </div>
        ) : moderators.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500">No moderators yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {moderators.map((moderator) => (
              <div key={moderator.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold">
                    {moderator.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{moderator.name}</h3>
                      <VerificationBadge type="mod" size="sm" />
                    </div>
                    <p className="text-sm text-gray-600">{moderator.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Joined {new Date(moderator.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
