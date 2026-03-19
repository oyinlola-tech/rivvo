import { NavLink } from 'react-router';
import { MessageCircle, Phone, Users, Settings, Sun, Moon, LogOut, User, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import rivvoLogo from 'figma:asset/89b224cd869a6897e590192ddf55cb45540dca68.png';
import { VerificationBadge } from './VerificationBadge';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/chats', icon: MessageCircle, label: 'Chats' },
    { path: '/status', icon: Video, label: 'Status' },
    { path: '/calls', icon: Phone, label: 'Calls' },
    { path: '/contacts', icon: Users, label: 'Contacts' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="hidden md:flex md:w-20 lg:w-72 bg-card border-r border-border flex-col">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={rivvoLogo} alt="Rivvo" className="w-10 h-10 lg:w-12 lg:h-12" />
          <h1 className="hidden lg:block text-2xl text-primary">Rivvo</h1>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-border">
        <NavLink to="/profile" className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-colors">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--online-indicator)] border-2 border-card rounded-full"></div>
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-foreground">{user?.name}</p>
              {user && <VerificationBadge role={user.role} size="sm" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 lg:p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-2 lg:p-4 border-t border-border space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
          <span className="hidden lg:block">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block">Admin Panel</span>
          </NavLink>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block">Logout</span>
        </button>
      </div>
    </div>
  );
}
