import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { authUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!authUser) {
    const loginPath = requiredRole === 'admin' ? '/admin/login' : '/moderator/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Wrong role
  if (authUser.role !== requiredRole) {
    const correctPath = authUser.role === 'admin' ? '/admin/dashboard' : '/moderator/dashboard';
    return <Navigate to={correctPath} replace />;
  }

  // Moderator not approved
  if (requiredRole === 'moderator' && !authUser.isApproved) {
    return <Navigate to="/moderator/pending" replace />;
  }

  return <>{children}</>;
}
