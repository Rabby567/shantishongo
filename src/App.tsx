import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminGuests from "./pages/admin/AdminGuests";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminModerators from "./pages/admin/AdminModerators";
import ModeratorLogin from "./pages/moderator/ModeratorLogin";
import ModeratorDashboard from "./pages/moderator/ModeratorDashboard";
import ModeratorGuests from "./pages/moderator/ModeratorGuests";
import ModeratorPending from "./pages/moderator/ModeratorPending";
import ModeratorProfile from "./pages/moderator/ModeratorProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            
            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/guests" element={<ProtectedRoute requiredRole="admin"><AdminGuests /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute requiredRole="admin"><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/moderators" element={<ProtectedRoute requiredRole="admin"><AdminModerators /></ProtectedRoute>} />
            
            {/* Moderator */}
            <Route path="/moderator/login" element={<ModeratorLogin />} />
            <Route path="/moderator/pending" element={<ModeratorPending />} />
            <Route path="/moderator/dashboard" element={<ProtectedRoute requiredRole="moderator"><ModeratorDashboard /></ProtectedRoute>} />
            <Route path="/moderator/guests" element={<ProtectedRoute requiredRole="moderator"><ModeratorGuests /></ProtectedRoute>} />
            <Route path="/moderator/profile" element={<ProtectedRoute requiredRole="moderator"><ModeratorProfile /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
