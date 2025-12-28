import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardList, UserCog, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ guests: 0, todayScans: 0, moderators: 0, pending: 0 });
  const navigate = useNavigate();

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [guests, attendance, moderators, pending] = await Promise.all([
      supabase.from('guests').select('id', { count: 'exact', head: true }),
      supabase.from('attendance').select('id', { count: 'exact', head: true }).gte('scanned_at', today.toISOString()),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'moderator'),
      supabase.from('moderator_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    setStats({
      guests: guests.count || 0,
      todayScans: attendance.count || 0,
      moderators: moderators.count || 0,
      pending: pending.count || 0,
    });
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime changes
    const attendanceChannel = supabase
      .channel('admin-attendance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => fetchStats()
      )
      .subscribe();

    const guestsChannel = supabase
      .channel('admin-guests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guests' },
        () => fetchStats()
      )
      .subscribe();

    const approvalsChannel = supabase
      .channel('admin-approvals-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moderator_approvals' },
        () => fetchStats()
      )
      .subscribe();

    const rolesChannel = supabase
      .channel('admin-roles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(guestsChannel);
      supabase.removeChannel(approvalsChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, []);

  const cards = [
    { title: 'Total Guests', value: stats.guests, icon: Users, color: 'text-primary', link: '/admin/guests' },
    { title: 'Scans Today', value: stats.todayScans, icon: ClipboardList, color: 'text-success', link: '/admin/attendance' },
    { title: 'Moderators', value: stats.moderators, icon: UserCog, color: 'text-accent', link: '/admin/moderators' },
    { title: 'Pending Approvals', value: stats.pending, icon: Clock, color: 'text-warning', link: '/admin/moderators' },
  ];

  return (
    <DashboardLayout role="admin">
      <h1 className="font-heading text-2xl font-bold mb-6">Dashboard Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card 
            key={card.title} 
            className="shadow-corporate cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(card.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
