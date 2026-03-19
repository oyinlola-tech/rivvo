import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Bell, Lock, Palette, Info, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MobileNav } from '../components/MobileNav';
import { toast } from 'sonner';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/auth/login');
    } catch (error: any) {
      toast.error('Failed to logout');
    }
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', onClick: () => navigate('/profile') },
        { icon: Lock, label: 'Privacy', onClick: () => {} },
        { icon: Bell, label: 'Notifications', onClick: () => navigate('/notifications') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Palette,
          label: 'Appearance',
          value: theme === 'light' ? 'Light' : 'Dark',
          onClick: toggleTheme,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', onClick: () => {} },
        { icon: Info, label: 'About', onClick: () => {} },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <h2 className="text-2xl text-foreground">Settings</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
        {/* User Profile Card */}
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-colors" onClick={() => navigate('/profile')}>
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg text-foreground truncate">{user?.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {user?.bio && <p className="text-sm text-muted-foreground truncate mt-1">{user.bio}</p>}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Settings Groups */}
        {settingsGroups.map((group, idx) => (
          <div key={idx} className="border-b border-border">
            <div className="px-4 md:px-6 py-2 bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{group.title}</p>
            </div>
            {group.items.map((item, itemIdx) => (
              <button
                key={itemIdx}
                onClick={item.onClick}
                className="flex items-center gap-3 w-full p-4 md:px-6 hover:bg-muted transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-left text-foreground">{item.label}</span>
                {item.value && (
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                )}
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ))}

        {/* Logout */}
        <div className="p-4 md:p-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-4 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        {/* App Version */}
        <div className="p-4 md:p-6 text-center text-sm text-muted-foreground">
          <p>Rivvo v1.0.0</p>
          <p className="mt-1">Made with React & Node.js</p>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
