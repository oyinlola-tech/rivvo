import { useState, useEffect } from 'react';
import { Plus, Trash2, Mail, User as UserIcon } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { User } from '../../contexts/AuthContext';
import { VerificationBadge } from '../../components/VerificationBadge';
import { toast } from 'sonner';

export function AdminModerators() {
  const [moderators, setModerators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '', password: '' });

  useEffect(() => {
    loadModerators();
  }, []);

  const loadModerators = async () => {
    try {
      setLoading(true);
      const modsData = await adminApi.getModerators();
      setModerators(modsData);
    } catch (error: any) {
      toast.error('Failed to load moderators');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createModerator(formData);
      toast.success('Moderator created successfully');
      setShowCreateModal(false);
      setFormData({ email: '', name: '', password: '' });
      loadModerators();
    } catch (error: any) {
      toast.error('Failed to create moderator');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this moderator?')) return;
    try {
      await adminApi.removeModerator(userId);
      toast.success('Moderator removed');
      loadModerators();
    } catch (error: any) {
      toast.error('Failed to remove moderator');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-foreground">Moderator Management</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>Add Moderator</span>
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Moderators can help manage users and content. They have elevated permissions but cannot access admin settings.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : moderators.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <UserIcon className="w-16 h-16 mb-4 opacity-50" />
            <p>No moderators yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-primary hover:underline"
            >
              Add your first moderator
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {moderators.map((mod) => (
              <div key={mod.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {mod.avatar ? (
                      <img src={mod.avatar} alt={mod.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-primary text-2xl">{mod.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(mod.id)}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <h3 className="text-lg text-foreground">{mod.name}</h3>
                  <VerificationBadge role="moderator" size="sm" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">{mod.email}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Joined {new Date(mod.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl text-foreground mb-4">Create New Moderator</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create Moderator
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ email: '', name: '', password: '' });
                  }}
                  className="flex-1 bg-muted text-foreground py-2 rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
