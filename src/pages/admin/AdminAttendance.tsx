import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  scanned_at: string;
  guest: {
    id: string;
    name: string;
    phone: string | null;
    image_url: string | null;
    qr_code: string;
  };
}

export default function AdminAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchAttendance = async () => {
    setLoading(true);
    const startDate = new Date(dateFilter);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateFilter);
    endDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('attendance')
      .select('id, scanned_at, guest:guests(id, name, phone, image_url, qr_code)')
      .gte('scanned_at', startDate.toISOString())
      .lte('scanned_at', endDate.toISOString())
      .order('scanned_at', { ascending: false });

    if (error) {
      toast.error('Failed to load attendance');
      console.error(error);
    } else {
      // Filter out null guests and cast properly
      const validRecords = (data || [])
        .filter((r): r is { id: string; scanned_at: string; guest: { id: string; name: string; phone: string | null; image_url: string | null; qr_code: string } } => 
          r.guest !== null && !Array.isArray(r.guest)
        );
      setRecords(validRecords);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAttendance(); }, [dateFilter]);

  const filteredRecords = records.filter(r =>
    r.guest.name.toLowerCase().includes(search.toLowerCase()) ||
    r.guest.phone?.includes(search) ||
    r.guest.qr_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Attendance List</h1>
        <Badge variant="secondary" className="w-fit">{filteredRecords.length} check-ins</Badge>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-9 w-auto" />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-corporate overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>QR ID</TableHead>
              <TableHead>Check-in Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No attendance records for this date</TableCell></TableRow>
            ) : filteredRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={record.guest.image_url || ''} alt={record.guest.name} />
                      <AvatarFallback>{record.guest.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{record.guest.name}</span>
                  </div>
                </TableCell>
                <TableCell>{record.guest.phone || '-'}</TableCell>
                <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{record.guest.qr_code}</code></TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {format(new Date(record.scanned_at), 'hh:mm a')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
