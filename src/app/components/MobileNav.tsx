import { NavLink } from 'react-router';
import { MessageCircle, Phone, Users, Settings, Video } from 'lucide-react';

export function MobileNav() {
  const navItems = [
    { path: '/chats', icon: MessageCircle, label: 'Chats' },
    { path: '/status', icon: Video, label: 'Status' },
    { path: '/calls', icon: Phone, label: 'Calls' },
    { path: '/contacts', icon: Users, label: 'Contacts' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
