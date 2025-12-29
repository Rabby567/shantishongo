import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, Calendar, Trash2, RotateCcw, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  scanned_by_profile: {
    full_name: string | null;
    email: string;
  } | null;
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
      .select('id, scanned_at, scanned_by, guest:guests(id, name, phone, image_url, qr_code), scanned_by_profile:profiles!attendance_scanned_by_fkey(full_name, email)')
      .gte('scanned_at', startDate.toISOString())
      .lte('scanned_at', endDate.toISOString())
      .order('scanned_at', { ascending: false });

    if (error) {
      toast.error('Failed to load attendance');
      console.error(error);
    } else {
      // Filter out null guests and cast properly
      const validRecords = (data || [])
        .filter((r): r is { id: string; scanned_at: string; scanned_by: string | null; guest: { id: string; name: string; phone: string | null; image_url: string | null; qr_code: string }; scanned_by_profile: { full_name: string | null; email: string } | null } => 
          r.guest !== null && !Array.isArray(r.guest)
        )
        .map(r => ({
          ...r,
          scanned_by_profile: Array.isArray(r.scanned_by_profile) ? r.scanned_by_profile[0] || null : r.scanned_by_profile
        }));
      setRecords(validRecords);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('admin-attendance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchAttendance())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFilter]);

  const deleteAttendance = async (id: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete attendance');
    } else {
      toast.success('Attendance deleted');
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const resetAllAttendance = async () => {
    const startDate = new Date(dateFilter);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateFilter);
    endDate.setHours(23, 59, 59, 999);

    const { error } = await supabase
      .from('attendance')
      .delete()
      .gte('scanned_at', startDate.toISOString())
      .lte('scanned_at', endDate.toISOString());

    if (error) {
      toast.error('Failed to reset attendance');
    } else {
      toast.success('All attendance for this date has been reset');
      setRecords([]);
    }
  };

  const filteredRecords = records.filter(r =>
    r.guest.name.toLowerCase().includes(search.toLowerCase()) ||
    r.guest.phone?.includes(search) ||
    r.guest.qr_code.toLowerCase().includes(search.toLowerCase()) ||
    r.scanned_by_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.scanned_by_profile?.email.toLowerCase().includes(search.toLowerCase())
  );

  const downloadCSV = () => {
    const headers = ['Guest Name', 'Phone', 'QR ID', 'Check-in Time', 'Scanned By'];
    const rows = filteredRecords.map(r => [
      r.guest.name,
      r.guest.phone || '-',
      r.guest.qr_code,
      format(new Date(r.scanned_at), 'hh:mm a'),
      r.scanned_by_profile?.full_name || r.scanned_by_profile?.email || '-'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Attendance-${dateFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success('CSV downloaded');
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Attendance List - ${format(new Date(dateFilter), 'MMM dd, yyyy')}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Total: ${filteredRecords.length} check-ins`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [['Guest Name', 'Phone', 'QR ID', 'Check-in Time', 'Scanned By']],
      body: filteredRecords.map(r => [
        r.guest.name,
        r.guest.phone || '-',
        r.guest.qr_code,
        format(new Date(r.scanned_at), 'hh:mm a'),
        r.scanned_by_profile?.full_name || r.scanned_by_profile?.email || '-'
      ]),
    });

    doc.save(`Attendance-${dateFilter}.pdf`);
    toast.success('PDF downloaded');
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Attendance List</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="w-fit">{filteredRecords.length} check-ins</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={filteredRecords.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={downloadCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadPDF}>
                <FileText className="h-4 w-4 mr-2" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={filteredRecords.length === 0}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Attendance?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all {filteredRecords.length} attendance records for {format(new Date(dateFilter), 'MMM dd, yyyy')}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAllAttendance} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reset All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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
              <TableHead>Scanned By</TableHead>
              <TableHead className="w-[60px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No attendance records for this date</TableCell></TableRow>
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
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {record.scanned_by_profile?.full_name || record.scanned_by_profile?.email || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attendance?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete the attendance record for {record.guest.name}. They will be able to scan again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAttendance(record.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}