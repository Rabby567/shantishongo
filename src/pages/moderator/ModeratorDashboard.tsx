import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Users, CalendarCheck, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  scan_date: string;
  scanned_at: string;
  guest: { name: string; designation: string | null; image_url: string | null } | null;
}

export default function ModeratorDashboard() {
  const { authUser } = useAuth();
  const [guestCount, setGuestCount] = useState(0);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  const fetchData = async () => {
    // Fetch guest count
    const { count } = await supabase.from('guests').select('id', { count: 'exact', head: true });
    setGuestCount(count || 0);

    // Fetch attendance records with guest info
    const { data: attendance } = await supabase
      .from('attendance')
      .select('id, scan_date, scanned_at, guest:guests(name, designation, image_url)')
      .order('scanned_at', { ascending: false })
      .limit(50);
    
    setAttendanceRecords(attendance || []);

    // Count today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = (attendance || []).filter(a => a.scan_date === today);
    setTodayCount(todayAttendance.length);
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('moderator-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <DashboardLayout role="moderator">
      <h1 className="font-heading text-2xl font-bold mb-2">Welcome, {authUser?.fullName || 'Moderator'}!</h1>
      <p className="text-muted-foreground mb-6">Manage guest registrations from here.</p>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="shadow-corporate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Guests</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{guestCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-corporate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins Today</CardTitle>
            <CalendarCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-corporate">
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No attendance records yet
                  </TableCell>
                </TableRow>
              ) : (
                attendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={record.guest?.image_url || undefined} alt={record.guest?.name || 'Guest'} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{record.guest?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{record.guest?.designation || '-'}</TableCell>
                    <TableCell>{format(new Date(record.scan_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(record.scanned_at), 'h:mm a')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
