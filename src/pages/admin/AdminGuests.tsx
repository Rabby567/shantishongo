import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { generateQRCodeWithImage, downloadQRCode } from '@/lib/qrcode';
import { toast } from 'sonner';
import { Plus, Download, Pencil, Trash2, Search, Loader2, Upload } from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  image_url: string | null;
  qr_code: string;
  created_at: string;
}

export default function AdminGuests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchGuests = async () => {
    const { data, error } = await supabase.from('guests').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load guests');
    else setGuests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchGuests(); }, []);

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.phone?.includes(search) ||
    g.qr_code.toLowerCase().includes(search.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingGuest(null);
    setFormData({ name: '', phone: '' });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEditDialog = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({ name: guest.name, phone: guest.phone || '' });
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
        phone: formData.phone || null,
        image_url: imageUrl,
      }).eq('id', editingGuest.id);
      if (error) toast.error('Failed to update guest');
      else toast.success('Guest updated');
    } else {
      const qrCode = `GUEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const { error } = await supabase.from('guests').insert({
        name: formData.name,
        phone: formData.phone || null,
        image_url: imageUrl,
        qr_code: qrCode,
      });
      if (error) toast.error('Failed to add guest');
      else toast.success('Guest added');
    }

    setDialogOpen(false);
    setSaving(false);
    fetchGuests();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) toast.error('Failed to delete guest');
    else { toast.success('Guest deleted'); fetchGuests(); }
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

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Guest List</h1>
        <Button onClick={openAddDialog} className="gap-2"><Plus className="h-4 w-4" />Add Guest</Button>
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
              <TableHead>Phone</TableHead>
              <TableHead>QR ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredGuests.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No guests found</TableCell></TableRow>
            ) : filteredGuests.map((guest) => (
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
                <TableCell>{guest.phone || '-'}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGuest ? 'Edit Guest' : 'Add Guest'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Guest name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" />
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
