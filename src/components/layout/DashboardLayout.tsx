import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';
import {
  QrCode,
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCog,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: 'admin' | 'moderator';
}

const adminNavItems: NavItem[] = [
  { label: 'Overview', href: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Guest List', href: '/admin/guests', icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance', href: '/admin/attendance', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Moderators', href: '/admin/moderators', icon: <UserCog className="h-5 w-5" /> },
];

const moderatorNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/moderator/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Guest List', href: '/moderator/guests', icon: <Users className="h-5 w-5" /> },
  { label: 'Profile', href: '/moderator/profile', icon: <UserCog className="h-5 w-5" /> },
];

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser } = useAuth();

  const navItems = role === 'admin' ? adminNavItems : moderatorNavItems;

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-corporate">
            <QrCode className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-semibold">QR Attend</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-card transition-transform duration-200 lg:relative lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Sidebar header - hidden on mobile, logo links to scanner */}
          <Link to="/" className="hidden h-16 items-center gap-2 border-b border-border px-6 lg:flex hover:opacity-90 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-corporate">
              <QrCode className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-semibold">QR Attend</span>
          </Link>

          {/* User info */}
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={authUser?.avatarUrl || undefined} alt={authUser?.fullName || 'User'} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium text-foreground">{authUser?.fullName || authUser?.email}</div>
                <div className="text-xs text-muted-foreground capitalize">{role}</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="border-t border-border p-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
