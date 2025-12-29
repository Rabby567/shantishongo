import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { QRScanner } from '@/components/scanner/QRScanner';
import { ScanResultModal, ScanStatus, GuestData } from '@/components/scanner/ScanResultModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Keyboard, Scan } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();
  const [scanStatus, setScanStatus] = useState<ScanStatus>(null);
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);

  const processGuestCode = async (qrCode: string) => {
    try {
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('id, name, qr_code, image_url')
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (guestError) {
        toast.error('Error looking up guest');
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
          .insert({ guest_id: guest.id, scan_date: today, scanned_by: user?.id || null });
        
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

  const handleScan = async (qrCode: string) => {
    if (isScanning) return;
    setIsScanning(true);
    await processGuestCode(qrCode);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = manualId.trim();
    if (!trimmedId) {
      toast.error('Please enter a guest ID');
      return;
    }
    setIsManualLoading(true);
    setIsScanning(true);
    await processGuestCode(trimmedId);
    setManualId('');
    setIsManualLoading(false);
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
              Scan guest QR codes or enter ID manually to record attendance
            </p>
          </div>
          
          <Tabs defaultValue="scan" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="scan" className="gap-2">
                <Scan className="h-4 w-4" />
                Scan QR
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Keyboard className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="scan">
              <QRScanner onScan={handleScan} isScanning={isScanning} />
            </TabsContent>
            
            <TabsContent value="manual">
              <div className="rounded-xl border-2 border-primary/20 bg-card p-6 shadow-corporate">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="guestId" className="text-sm font-medium text-foreground">
                      Guest ID
                    </label>
                    <Input
                      id="guestId"
                      type="text"
                      placeholder="Enter guest ID (e.g., G-123456)"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      disabled={isManualLoading}
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the guest ID code printed on their QR badge
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isManualLoading || !manualId.trim()}
                  >
                    {isManualLoading ? 'Processing...' : 'Check In Guest'}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
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
