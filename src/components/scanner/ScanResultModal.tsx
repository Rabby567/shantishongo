import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScanStatus = 'success' | 'already_scanned' | 'not_found' | null;

interface ScanResultModalProps {
  status: ScanStatus;
  guestName?: string;
  onClose: () => void;
}

export function ScanResultModal({ status, guestName, onClose }: ScanResultModalProps) {
  if (!status) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      title: 'Success!',
      message: `Welcome, ${guestName || 'Guest'}!`,
      bgClass: 'bg-success',
      iconClass: 'text-success',
      animation: 'animate-pulse-success',
    },
    already_scanned: {
      icon: XCircle,
      title: 'Already Scanned',
      message: `${guestName || 'This guest'} has already checked in.`,
      bgClass: 'bg-destructive',
      iconClass: 'text-destructive',
      animation: 'animate-shake',
    },
    not_found: {
      icon: AlertCircle,
      title: 'Not Found',
      message: 'This QR code is not registered in the system.',
      bgClass: 'bg-warning',
      iconClass: 'text-warning',
      animation: 'animate-shake',
    },
  };

  const { icon: Icon, title, message, iconClass, animation } = config[status];

  return (
    <Dialog open={!!status} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className={cn('flex flex-col items-center gap-4 py-6', animation)}>
          <div className={cn('rounded-full p-4', iconClass === 'text-success' ? 'bg-success/10' : iconClass === 'text-destructive' ? 'bg-destructive/10' : 'bg-warning/10')}>
            <Icon className={cn('h-16 w-16', iconClass)} />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-center text-muted-foreground">{message}</p>
          <Button onClick={onClose} className="mt-2 w-full max-w-xs">
            Continue Scanning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
