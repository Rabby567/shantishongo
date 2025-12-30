import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { generateQRCodeWithImage, downloadQRCode } from '@/lib/qrcode';
import { toast } from 'sonner';
import { Plus, Download, Pencil, Trash2, Search, Loader2, Upload, Archive, FileText, FileSpreadsheet } from 'lucide-react';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Guest {
  id: string;
  name: string;
  designation: string | null;
  image_url: string | null;
  qr_code: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function AdminGuests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({ name: '', designation: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('guests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (debouncedSearch.trim()) {
        query = query.or(`name.ilike.%${debouncedSearch}%,designation.ilike.%${debouncedSearch}%,qr_code.ilike.%${debouncedSearch}%`);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      setGuests(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      toast.error('Failed to load guests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    fetchGuests();

    const channel = supabase
      .channel('admin-guests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, () => fetchGuests())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGuests]);

  const openAddDialog = () => {
    setEditingGuest(null);
    setFormData({ name: '', designation: '' });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEditDialog = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({ name: guest.name, designation: guest.designation || '' });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);

    let imageUrl = editingGuest?.image_url || null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('guest-images').upload(fileName, imageFile);
      if (uploadError) {
        toast.error('Failed to upload image');
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('guest-images').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    if (editingGuest) {
      const { error } = await supabase.from('guests').update({
        name: formData.name,
        designation: formData.designation || null,
        image_url: imageUrl,
      }).eq('id', editingGuest.id);
      if (error) toast.error('Failed to update guest');
      else toast.success('Guest updated');
    } else {
      const qrCode = `GUEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const { error } = await supabase.from('guests').insert({
        name: formData.name,
        designation: formData.designation || null,
        image_url: imageUrl,
        qr_code: qrCode,
      });
      if (error) toast.error('Failed to add guest');
      else toast.success('Guest added');
    }

    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) toast.error('Failed to delete guest');
    else toast.success('Guest deleted');
  };

  const handleDownloadQR = async (guest: Guest) => {
    setDownloadingId(guest.id);
    try {
      const qrDataUrl = await generateQRCodeWithImage(guest.qr_code, guest.image_url || undefined);
      downloadQRCode(qrDataUrl, `QR-${guest.name.replace(/\s+/g, '-')}`);
      toast.success('QR code downloaded');
    } catch { toast.error('Failed to generate QR code'); }
    setDownloadingId(null);
  };

  const handleDownloadAllQR = async () => {
    setDownloadingAll(true);
    try {
      // Fetch all guests (no pagination)
      const { data: allGuests, error } = await supabase
        .from('guests')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (!allGuests || allGuests.length === 0) {
        toast.error('No guests to download');
        setDownloadingAll(false);
        return;
      }

      const zip = new JSZip();
      const toastId = toast.loading(`Generating QR codes... 0/${allGuests.length}`);

      for (let i = 0; i < allGuests.length; i++) {
        const guest = allGuests[i];
        toast.loading(`Generating QR codes... ${i + 1}/${allGuests.length}`, { id: toastId });
        
        const qrDataUrl = await generateQRCodeWithImage(guest.qr_code, guest.image_url || undefined);
        const base64Data = qrDataUrl.split(',')[1];
        const fileName = `QR-${guest.name.replace(/[^a-zA-Z0-9]/g, '-')}-${guest.qr_code}.png`;
        zip.file(fileName, base64Data, { base64: true });
      }

      toast.loading('Creating ZIP file...', { id: toastId });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `All-Guest-QR-Codes-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(`Downloaded ${allGuests.length} QR codes`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to download QR codes');
    }
    setDownloadingAll(false);
  };

  const downloadGuestsCSV = async () => {
    try {
      const { data: allGuests, error } = await supabase
        .from('guests')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (!allGuests || allGuests.length === 0) {
        toast.error('No guests to download');
        return;
      }

      const headers = ['Name', 'Designation', 'QR ID', 'Created At'];
      const rows = allGuests.map(g => [
        g.name,
        g.designation || '-',
        g.qr_code,
        new Date(g.created_at).toLocaleDateString()
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Guest-List-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('CSV downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download CSV');
    }
  };

  const downloadGuestsPDF = async () => {
    try {
      const { data: allGuests, error } = await supabase
        .from('guests')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (!allGuests || allGuests.length === 0) {
        toast.error('No guests to download');
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Guest List', 14, 22);
      doc.setFontSize(11);
      doc.text(`Total: ${allGuests.length} guests`, 14, 30);

      autoTable(doc, {
        startY: 35,
        head: [['Name', 'Designation', 'QR ID', 'Created At']],
        body: allGuests.map(g => [
          g.name,
          g.designation || '-',
          g.qr_code,
          new Date(g.created_at).toLocaleDateString()
        ]),
      });

      doc.save(`Guest-List-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download PDF');
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Guest List</h1>
          <p className="text-sm text-muted-foreground">{totalCount} guest{totalCount !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={totalCount === 0} className="gap-2">
                <Download className="h-4 w-4" /> Download List
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={downloadGuestsCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadGuestsPDF}>
                <FileText className="h-4 w-4 mr-2" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleDownloadAllQR} disabled={downloadingAll || totalCount === 0} className="gap-2">
            {downloadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Download All QR
          </Button>
          <Button onClick={openAddDialog} className="gap-2"><Plus className="h-4 w-4" />Add Guest</Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search guests..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-corporate overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>QR ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : guests.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{debouncedSearch ? 'No guests found matching your search' : 'No guests found'}</TableCell></TableRow>
            ) : guests.map((guest) => (
              <TableRow key={guest.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={guest.image_url || ''} alt={guest.name} />
                      <AvatarFallback>{guest.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{guest.name}</span>
                  </div>
                </TableCell>
                <TableCell>{guest.designation || '-'}</TableCell>
                <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{guest.qr_code}</code></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadQR(guest)} disabled={downloadingId === guest.id}>
                      {downloadingId === guest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(guest)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(guest.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {totalCount} guests
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {getPageNumbers().map((page, i) => (
                <PaginationItem key={i}>
                  {page === '...' ? (
                    <span className="px-3 py-2">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGuest ? 'Edit Guest' : 'Add Guest'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Guest name" />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} placeholder="e.g. Manager, VIP, Speaker" />
            </div>
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-4">
                {(imageFile || editingGuest?.image_url) && (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={imageFile ? URL.createObjectURL(imageFile) : editingGuest?.image_url || ''} />
                    <AvatarFallback>{formData.name.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                )}
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" /><span className="text-sm">Upload Image</span>
                  </div>
                  <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingGuest ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
