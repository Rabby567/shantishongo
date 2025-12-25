import { useEffect, useRef, useState, useCallback } from 'react';
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
  const isStartingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
      setIsStarted(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (isStartingRef.current || scannerRef.current) return;
    isStartingRef.current = true;

    try {
      setError(null);
      
      const scanner = new Html5Qrcode('qr-reader', { verbose: false });
      scannerRef.current = scanner;

      // Calculate qrbox size based on container width (responsive)
      const containerWidth = document.getElementById('qr-reader')?.offsetWidth || 300;
      const qrboxSize = Math.min(containerWidth - 50, 250);

      // Try environment camera first, fall back to any camera
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: qrboxSize, height: qrboxSize },
            disableFlip: false,
          },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );
      } catch (envError) {
        console.log('Environment camera failed, trying any camera:', envError);
        // Fall back to any available camera
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          await scanner.start(
            devices[0].id,
            {
              fps: 10,
              qrbox: { width: qrboxSize, height: qrboxSize },
              disableFlip: false,
            },
            (decodedText) => {
              onScan(decodedText);
            },
            () => {}
          );
        } else {
          throw new Error('No camera found on this device');
        }
      }

      setHasPermission(true);
      setIsStarted(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setHasPermission(false);
      
      if (err.message?.includes('No camera found')) {
        setError('No camera found on this device.');
      } else if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setError('Camera access denied. Please allow camera access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please ensure your device has a camera.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another application. Please close other apps using the camera.');
      } else {
        setError('Could not start camera. Please check your browser permissions and try again.');
      }
      
      scannerRef.current = null;
    } finally {
      isStartingRef.current = false;
    }
  }, [onScan]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Scanner container */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border-2 border-primary/20 bg-card shadow-corporate">
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
