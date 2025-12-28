import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { QRScanner } from '@/components/scanner/QRScanner';
import { ScanResultModal, ScanStatus, GuestData } from '@/components/scanner/ScanResultModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>(null);
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async (qrCode: string) => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('id, name, qr_code, image_url')
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (guestError) {
        toast.error('Error looking up guest');
        setIsScanning(false);
        return;
      }

      if (!guest) {
        setGuestData(null);
        setScanStatus('not_found');
        return;
      }

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already scanned today
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('guest_id', guest.id)
        .eq('scan_date', today)
        .maybeSingle();

      setGuestData({
        name: guest.name,
        qr_code: guest.qr_code,
        image_url: guest.image_url,
      });

      if (existingAttendance) {
        setScanStatus('already_scanned');
      } else {
        // Insert with scan_date to ensure uniqueness at DB level
        const { error: insertError } = await supabase
          .from('attendance')
          .insert({ guest_id: guest.id, scan_date: today });
        
        if (insertError) {
          // If duplicate key error, they were already scanned
          if (insertError.code === '23505') {
            setScanStatus('already_scanned');
          } else {
            throw insertError;
          }
        } else {
          setScanStatus('success');
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('An error occurred while scanning');
    }
  };

  const handleCloseModal = () => {
    setScanStatus(null);
    setIsScanning(false);
    setGuestData(null);
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
        guest={guestData} 
        onClose={handleCloseModal} 
      />
    </div>
  );
};

export default Index;
