import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { QRScanner } from '@/components/scanner/QRScanner';
import { ScanResultModal, ScanStatus } from '@/components/scanner/ScanResultModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>(null);
  const [guestName, setGuestName] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async (qrCode: string) => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('id, name')
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (guestError) {
        toast.error('Error looking up guest');
        setIsScanning(false);
        return;
      }

      if (!guest) {
        setGuestName('');
        setScanStatus('not_found');
        setIsScanning(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('guest_id', guest.id)
        .gte('scanned_at', today.toISOString())
        .maybeSingle();

      setGuestName(guest.name);

      if (existingAttendance) {
        setScanStatus('already_scanned');
      } else {
        await supabase.from('attendance').insert({ guest_id: guest.id });
        setScanStatus('success');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('An error occurred while scanning');
    }
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
              QR Code Scanner
            </h1>
            <p className="mt-2 text-muted-foreground">
              Scan guest QR codes to record attendance
            </p>
          </div>
          <QRScanner onScan={handleScan} isScanning={isScanning} />
        </div>
      </main>
      <ScanResultModal 
        status={scanStatus} 
        guestName={guestName} 
        onClose={() => setScanStatus(null)} 
      />
    </div>
  );
};

export default Index;
