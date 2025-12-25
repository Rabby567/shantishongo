import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QrCode, Shield, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';

export function Navbar() {
  const { authUser, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const getDashboardPath = () => {
    if (authUser?.role === 'admin') return '/admin/dashboard';
    if (authUser?.role === 'moderator') return '/moderator/dashboard';
    return '/';
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo - Always goes to scanner */}
        <Link 
          to="/" 
          className="flex items-center gap-2 text-primary hover:opacity-90 transition-opacity"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-corporate shadow-corporate">
            <QrCode className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-semibold text-foreground">
            QR Attend
          </span>
        </Link>

        {/* Right side buttons */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : authUser ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:block">
                {authUser.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2"
              >
                <Link to="/admin/login">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="gap-2"
              >
                <Link to="/moderator/login">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Moderator</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
