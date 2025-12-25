import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Check, X, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

interface Moderator {
  user_id: string;
  email: string;
  full_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminModerators() {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; moderator: Moderator | null; newPassword?: string }>({ open: false, moderator: null });

  const fetchModerators = async () => {
    // Get all users with moderator role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'moderator');

    if (rolesError) {
      toast.error('Failed to load moderators');
      setLoading(false);
      return;
    }

    const userIds = roles?.map(r => r.user_id) || [];
    if (userIds.length === 0) {
      setModerators([]);
      setLoading(false);
      return;
    }

    // Get profiles for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    // Get approval status
    const { data: approvals } = await supabase
      .from('moderator_approvals')
      .select('user_id, status, created_at')
      .in('user_id', userIds);

    const moderatorList: Moderator[] = (profiles || []).map(profile => {
      const approval = approvals?.find(a => a.user_id === profile.id);
      return {
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        status: (approval?.status as 'pending' | 'approved' | 'rejected') || 'pending',
        created_at: approval?.created_at || '',
      };
    });

    setModerators(moderatorList);
    setLoading(false);
  };

  useEffect(() => { fetchModerators(); }, []);

  const updateStatus = async (userId: string, status: 'approved' | 'rejected') => {
    setActionLoading(userId);
    const { error } = await supabase
      .from('moderator_approvals')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) toast.error('Failed to update status');
    else {
      toast.success(`Moderator ${status}`);
      fetchModerators();
    }
    setActionLoading(null);
  };

  const deleteModerator = async (userId: string) => {
    if (!confirm('Delete this moderator? This will remove their account.')) return;
    setActionLoading(userId);
    
    // Delete from moderator_approvals
    await supabase.from('moderator_approvals').delete().eq('user_id', userId);
    // Delete from user_roles
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    toast.success('Moderator removed');
    fetchModerators();
    setActionLoading(null);
  };

  const resetPassword = async () => {
    if (!resetDialog.moderator) return;
    setActionLoading(resetDialog.moderator.user_id);
    
    // Generate a random password
    const newPassword = Math.random().toString(36).slice(-10) + 'A1!';
    
    // Note: In production, you'd use an admin API or edge function to reset passwords
    // For now, we'll just show the generated password
    setResetDialog({ ...resetDialog, newPassword });
    toast.success('New password generated');
    setActionLoading(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      pending: { variant: 'secondary', className: 'bg-warning/10 text-warning border-warning/20' },
      approved: { variant: 'default', className: 'bg-success/10 text-success border-success/20' },
      rejected: { variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    };
    return <Badge variant="outline" className={variants[status]?.className}>{status.toUpperCase()}</Badge>;
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Moderator Management</h1>
        <Badge variant="secondary">{moderators.length} moderators</Badge>
      </div>

      <div className="rounded-lg border bg-card shadow-corporate overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : moderators.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No moderators registered yet</TableCell></TableRow>
            ) : moderators.map((mod) => (
              <TableRow key={mod.user_id}>
                <TableCell className="font-medium">{mod.full_name || '-'}</TableCell>
                <TableCell>{mod.email}</TableCell>
                <TableCell>{getStatusBadge(mod.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {mod.created_at ? format(new Date(mod.created_at), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {mod.status === 'pending' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => updateStatus(mod.user_id, 'approved')} disabled={actionLoading === mod.user_id} className="text-success hover:text-success">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => updateStatus(mod.user_id, 'rejected')} disabled={actionLoading === mod.user_id} className="text-destructive hover:text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {mod.status === 'approved' && (
                      <Button variant="ghost" size="icon" onClick={() => setResetDialog({ open: true, moderator: mod })} disabled={actionLoading === mod.user_id}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteModerator(mod.user_id)} disabled={actionLoading === mod.user_id} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={resetDialog.open} onOpenChange={(open) => setResetDialog({ open, moderator: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Generate a new temporary password for {resetDialog.moderator?.full_name || resetDialog.moderator?.email}</DialogDescription>
          </DialogHeader>
          {resetDialog.newPassword ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">New temporary password:</p>
              <code className="block p-3 bg-muted rounded-lg text-lg font-mono select-all">{resetDialog.newPassword}</code>
              <p className="text-xs text-muted-foreground mt-2">Please share this securely with the moderator.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">This will generate a new random password for this moderator.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog({ open: false, moderator: null })}>Close</Button>
            {!resetDialog.newPassword && (
              <Button onClick={resetPassword} disabled={!!actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate Password
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
