import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Edit2, Users, UserPlus, UserMinus, LogOut, Bell, BellOff, Trash2 } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { VerificationBadge } from '../components/VerificationBadge';
import { toast } from 'sonner';

export function GroupSettingsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { chats, activeChat, setActiveChat, updateGroup, leaveGroup } = useChat();
  const [group, setGroup] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (groupId) {
      setActiveChat(groupId);
      const foundGroup = chats.find(c => c.id === groupId);
      if (foundGroup) {
        setGroup(foundGroup);
        setGroupName(foundGroup.name || '');
      }
    }
  }, [groupId, chats, setActiveChat]);

  const handleSave = async () => {
    if (!groupId) return;
    try {
      await updateGroup(groupId, { name: groupName });
      setIsEditing(false);
      toast.success('Group name updated');
    } catch (error: any) {
      toast.error('Failed to update group');
    }
  };

  const handleLeave = async () => {
    if (!groupId) return;
    if (confirm('Are you sure you want to leave this group?')) {
      try {
        await leaveGroup(groupId);
        toast.success('Left group');
        navigate('/chats');
      } catch (error: any) {
        toast.error('Failed to leave group');
      }
    }
  };

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-xl text-foreground">Group Settings</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Group Info */}
        <div className="flex flex-col items-center p-8 border-b border-border">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl mb-4">
            {group.avatar ? (
              <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-primary">{group.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 w-full max-w-md">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-center"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setGroupName(group.name || '');
                }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-2xl text-foreground">{group.name}</h3>
              <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-muted rounded transition-colors">
                <Edit2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {group.participants?.length || 0} members
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2 border-b border-border">
          <button className="flex items-center gap-3 w-full p-3 hover:bg-muted rounded-lg transition-colors">
            <UserPlus className="w-5 h-5 text-primary" />
            <span className="text-foreground">Add Members</span>
          </button>
          <button className="flex items-center gap-3 w-full p-3 hover:bg-muted rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-primary" />
            <span className="text-foreground">Mute Notifications</span>
          </button>
        </div>

        {/* Members */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm text-muted-foreground uppercase tracking-wider">Members</h4>
            <span className="text-sm text-muted-foreground">{group.participants?.length || 0} members</span>
          </div>
          <div className="space-y-1">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  M
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-foreground">Member {idx + 1}</p>
                    <VerificationBadge role={idx === 0 ? 'admin' : 'user'} size="sm" />
                  </div>
                  {idx === 0 && <p className="text-xs text-muted-foreground">Group Admin</p>}
                </div>
                {idx !== 0 && (
                  <button className="p-2 hover:bg-muted rounded-full transition-colors">
                    <UserMinus className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-4 space-y-2">
          <button
            onClick={handleLeave}
            className="flex items-center gap-3 w-full p-3 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
}
