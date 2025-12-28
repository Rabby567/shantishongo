import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export type ScanStatus = 'success' | 'already_scanned' | 'not_found' | null;

export interface GuestData {
  name: string;
  qr_code: string;
  image_url?: string | null;
}

interface ScanResultModalProps {
  status: ScanStatus;
  guest?: GuestData | null;
  onClose: () => void;
}

export function ScanResultModal({ status, guest, onClose }: ScanResultModalProps) {
  if (!status) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      title: 'Check-in Successful!',
      iconClass: 'text-success',
      bgClass: 'bg-success/10',
      animation: 'animate-pulse-success',
    },
    already_scanned: {
      icon: XCircle,
      title: 'Already Scanned',
      iconClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
      animation: 'animate-shake',
    },
    not_found: {
      icon: AlertCircle,
      title: 'Not Found',
      iconClass: 'text-warning',
      bgClass: 'bg-warning/10',
      animation: 'animate-shake',
    },
  };

  const { icon: Icon, title, iconClass, bgClass, animation } = config[status];

  return (
    <Dialog open={!!status} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className={cn('flex flex-col items-center gap-4 py-6', animation)}>
          {/* Status Icon */}
          <div className={cn('rounded-full p-3', bgClass)}>
            <Icon className={cn('h-12 w-12', iconClass)} />
          </div>
          
          <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
          
          {/* Guest Details - only show if guest exists */}
          {guest && status !== 'not_found' && (
            <div className="flex flex-col items-center gap-4 w-full p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={guest.image_url || undefined} alt={guest.name} />
                <AvatarFallback className="text-2xl bg-primary/10">
                  <User className="h-12 w-12 text-primary" />
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center space-y-1">
                <p className="text-xl font-semibold text-foreground">{guest.name}</p>
                <p className="text-sm text-muted-foreground font-mono bg-background px-3 py-1 rounded-full">
                  {guest.qr_code}
                </p>
              </div>
            </div>
          )}
          
          {/* Not Found Message */}
          {status === 'not_found' && (
            <p className="text-center text-muted-foreground">
              This QR code is not registered in the system.
            </p>
          )}
          
          <Button onClick={onClose} className="mt-2 w-full max-w-xs">
            Continue Scanning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
