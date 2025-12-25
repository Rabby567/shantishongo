import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  isScanning: boolean;
}

export function QRScanner({ onScan, isScanning }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      setError(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // Ignore errors during scanning
        }
      );

      setHasPermission(true);
      setIsStarted(true);
    } catch (err) {
      console.error('Scanner error:', err);
      setHasPermission(false);
      setError('Camera access denied. Please allow camera access to scan QR codes.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isStarted) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsStarted(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Scanner container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-sm overflow-hidden rounded-xl border-2 border-primary/20 bg-card shadow-corporate"
      >
        <div
          id="qr-reader"
          className="aspect-square w-full"
          style={{ display: isStarted ? 'block' : 'none' }}
        />

        {!isStarted && (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-4 bg-muted/50 p-8">
            {hasPermission === false ? (
              <>
                <CameraOff className="h-16 w-16 text-muted-foreground" />
                <p className="text-center text-sm text-muted-foreground">{error}</p>
                <Button onClick={startScanner} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <Camera className="h-16 w-16 text-primary/60" />
                <p className="text-center text-sm text-muted-foreground">
                  Click the button below to start scanning
                </p>
                <Button onClick={startScanner} className="gap-2" disabled={isScanning}>
                  <Camera className="h-4 w-4" />
                  Start Camera
                </Button>
              </>
            )}
          </div>
        )}

        {/* Scanning overlay */}
        {isStarted && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 border-2 border-primary rounded-lg animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isStarted && (
        <Button variant="outline" onClick={stopScanner} className="gap-2">
          <CameraOff className="h-4 w-4" />
          Stop Camera
        </Button>
      )}

      {/* Instructions */}
      <p className="text-center text-sm text-muted-foreground max-w-xs">
        Position the QR code within the frame to scan
      </p>
    </div>
  );
}
