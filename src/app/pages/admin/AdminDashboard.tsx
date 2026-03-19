import { Outlet, NavLink, Navigate } from 'react-router';
import { Users, Shield, BarChart3, Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import rivvoLogo from 'figma:asset/89b224cd869a6897e590192ddf55cb45540dca68.png';


export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/moderators', icon: Shield, label: 'Moderators' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <img src={rivvoLogo} alt="Rivvo" className="w-10 h-10" />
            <div>
              <h1 className="text-xl text-primary">Rivvo</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to App</span>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
