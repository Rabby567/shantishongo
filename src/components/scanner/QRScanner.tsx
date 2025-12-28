import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCw, SwitchCamera } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  isScanning: boolean;
}

export function QRScanner({ onScan, isScanning }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
      setIsStarted(false);
    }
  }, []);

  const startScanner = useCallback(async (cameraId?: string) => {
    if (scannerRef.current) {
      await stopScanner();
    }

    try {
      setError(null);
      
      const container = document.getElementById('qr-reader');
      if (!container) {
        setError('Scanner container not found. Please refresh the page.');
        return;
      }

      container.innerHTML = '';
      
      const scanner = new Html5Qrcode('qr-reader', { verbose: false });
      scannerRef.current = scanner;

      let devices: CameraDevice[] = [];
      try {
        devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch (camErr) {
        console.warn('Could not enumerate cameras:', camErr);
      }

      const containerWidth = container.offsetWidth || 300;
      const qrboxSize = Math.min(Math.floor(containerWidth * 0.7), 250);

      const config = {
        fps: 10,
        qrbox: { width: qrboxSize, height: qrboxSize },
        disableFlip: false,
      };

      const onScanSuccess = (decodedText: string) => {
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        
        // Play success sound
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (err) {
          console.log('Audio feedback not available');
        }
        
        onScan(decodedText);
      };

      const onScanError = () => {};

      if (cameraId) {
        await scanner.start(cameraId, config, onScanSuccess, onScanError);
      } else {
        try {
          await scanner.start({ facingMode: 'environment' }, config, onScanSuccess, onScanError);
          const envIndex = devices.findIndex(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          if (envIndex >= 0) setCurrentCameraIndex(envIndex);
        } catch (envError) {
          console.log('Environment camera failed, trying alternatives:', envError);
          if (devices && devices.length > 0) {
            await scanner.start(devices[0].id, config, onScanSuccess, onScanError);
            setCurrentCameraIndex(0);
          } else {
            try {
              await scanner.start({ facingMode: 'user' }, config, onScanSuccess, onScanError);
            } catch (userError) {
              throw new Error('No camera available or permission denied');
            }
          }
        }
      }

      setHasPermission(true);
      setIsStarted(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setHasPermission(false);
      scannerRef.current = null;
      
      if (err.message?.includes('No camera') || err.message?.includes('permission denied')) {
        setError('Camera access denied or no camera found. Please allow camera access and try again.');
      } else if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setError('Camera access denied. Please allow camera access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please ensure your device has a camera.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another application. Please close other apps using the camera.');
      } else if (err.message?.includes('already scanning')) {
        setIsStarted(true);
        setHasPermission(true);
      } else {
        setError('Could not start camera. Please check your browser permissions and try again.');
      }
    }
  }, [onScan, stopScanner]);

  const switchCamera = useCallback(async () => {
    if (cameras.length < 2) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    await stopScanner();
    setCurrentCameraIndex(nextIndex);
    
    setTimeout(() => {
      startScanner(nextCamera.id);
    }, 200);
  }, [cameras, currentCameraIndex, stopScanner, startScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border-2 border-primary/20 bg-card shadow-corporate">
        <div
          id="qr-reader"
          ref={containerRef}
          className="aspect-square w-full"
          style={{ 
            display: isStarted ? 'block' : 'none',
            minHeight: '300px'
          }}
        />

        {!isStarted && (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-4 bg-muted/50 p-8" style={{ minHeight: '300px' }}>
            {hasPermission === false ? (
              <>
                <CameraOff className="h-16 w-16 text-muted-foreground" />
                <p className="text-center text-sm text-muted-foreground">{error}</p>
                <Button onClick={() => startScanner()} className="gap-2">
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
                <Button onClick={() => startScanner()} className="gap-2" disabled={isScanning}>
                  <Camera className="h-4 w-4" />
                  Start Camera
                </Button>
              </>
            )}
          </div>
        )}

        {isStarted && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 border-2 border-primary rounded-lg animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {isStarted && (
        <div className="flex gap-2">
          {cameras.length > 1 && (
            <Button variant="outline" onClick={switchCamera} className="gap-2">
              <SwitchCamera className="h-4 w-4" />
              Switch Camera
            </Button>
          )}
          <Button variant="outline" onClick={stopScanner} className="gap-2">
            <CameraOff className="h-4 w-4" />
            Stop Camera
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground max-w-xs">
        Position the QR code within the frame to scan
      </p>
    </div>
  );
}
