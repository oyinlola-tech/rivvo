import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Edit2, Mail, Phone, Calendar, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { VerificationBadge } from '../components/VerificationBadge';
import { toast } from 'sonner';

export function ProfilePage() {
  const { userId } = useParams();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || '');
      setPhoneNumber(user.phoneNumber || '');
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await updateProfile({ name, bio, phoneNumber });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name);
      setBio(user.bio || '');
      setPhoneNumber(user.phoneNumber || '');
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-xl text-foreground">Profile</h2>
        <div className="flex-1"></div>
        {isOwnProfile && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Edit2 className="w-5 h-5 text-primary" />
          </button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Avatar Section */}
        <div className="flex flex-col items-center p-8 border-b border-border">
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-4xl">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:opacity-90 transition-opacity">
                <Edit2 className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-2xl text-foreground">{user?.name}</h3>
            {user && <VerificationBadge role={user.role} size="lg" />}
          </div>
          {user?.role !== 'user' && (
            <p className="text-sm text-primary mb-2">
              {user?.role === 'admin' ? 'Administrator' : 'Moderator'}
            </p>
          )}
        </div>

        {/* Details Section */}
        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Name</label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            ) : (
              <p className="text-foreground">{user?.name}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Bio</label>
            {isEditing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
              />
            ) : (
              <p className="text-foreground">{user?.bio || 'No bio added'}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Email</label>
            <div className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span>{user?.email}</span>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Phone Number</label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="flex-1 px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-foreground">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span>{user?.phoneNumber || 'No phone number added'}</span>
              </div>
            )}
          </div>

          {/* Join Date */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Member Since</label>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
