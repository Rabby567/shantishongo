import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardList, UserCog, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ guests: 0, todayScans: 0, moderators: 0, pending: 0 });

  useEffect(() => {
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
    fetchStats();
  }, []);

  const cards = [
    { title: 'Total Guests', value: stats.guests, icon: Users, color: 'text-primary' },
    { title: 'Scans Today', value: stats.todayScans, icon: ClipboardList, color: 'text-success' },
    { title: 'Moderators', value: stats.moderators, icon: UserCog, color: 'text-accent' },
    { title: 'Pending Approvals', value: stats.pending, icon: Clock, color: 'text-warning' },
  ];

  return (
    <DashboardLayout role="admin">
      <h1 className="font-heading text-2xl font-bold mb-6">Dashboard Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-corporate">
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
