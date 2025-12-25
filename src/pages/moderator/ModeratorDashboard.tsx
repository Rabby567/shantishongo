import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ModeratorDashboard() {
  const { authUser } = useAuth();
  const [guestCount, setGuestCount] = useState(0);

  const fetchCount = async () => {
    const { count } = await supabase.from('guests').select('id', { count: 'exact', head: true });
    setGuestCount(count || 0);
  };

  useEffect(() => {
    fetchCount();

    // Subscribe to realtime changes for guests
    const guestsChannel = supabase
      .channel('moderator-guests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guests' },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(guestsChannel);
    };
  }, []);

  return (
    <DashboardLayout role="moderator">
      <h1 className="font-heading text-2xl font-bold mb-2">Welcome, {authUser?.fullName || 'Moderator'}!</h1>
      <p className="text-muted-foreground mb-6">Manage guest registrations from here.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-corporate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Guests</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{guestCount}</div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
