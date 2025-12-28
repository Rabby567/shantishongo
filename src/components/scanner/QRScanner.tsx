import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCw, SwitchCamera, Loader2 } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  isScanning: boolean;
}

export function QRScanner({ onScan, isScanning }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

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
      if (mountedRef.current) {
        setIsStarted(false);
      }
    }
  }, []);

  const requestCameraPermission = async (): Promise<MediaStream | null> => {
    try {
      // Try back camera first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' } } 
      });
      return stream;
    } catch (err) {
      // Try any camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        return stream;
      } catch (fallbackErr) {
        console.error('Permission request failed:', fallbackErr);
        return null;
      }
    }
  };

  const startScanner = useCallback(async (cameraId?: string) => {
    if (scannerRef.current) {
      await stopScanner();
    }

    setIsLoading(true);
    setError(null);

    let permissionStream: MediaStream | null = null;

    try {
      // First, explicitly request camera permission
      permissionStream = await requestCameraPermission();
      if (!permissionStream) {
        throw new Error('Camera permission denied');
      }

      if (!mountedRef.current) {
        permissionStream.getTracks().forEach(track => track.stop());
        return;
      }

      const container = document.getElementById('qr-reader');
      if (!container) {
        permissionStream.getTracks().forEach(track => track.stop());
        setError('Scanner container not found. Please refresh the page.');
        setIsLoading(false);
        return;
      }

      // Clear the container
      container.innerHTML = '';
      
      // Stop the permission stream BEFORE creating Html5Qrcode
      permissionStream.getTracks().forEach(track => track.stop());
      permissionStream = null;
      
      // Wait for Chrome to fully release the camera
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!mountedRef.current) return;

      const scanner = new Html5Qrcode('qr-reader', { verbose: false });
      scannerRef.current = scanner;

      // Get available cameras
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
        aspectRatio: 1,
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

      // Try to start the scanner with different methods
      let started = false;

      if (cameraId) {
        try {
          await scanner.start(cameraId, config, onScanSuccess, onScanError);
          started = true;
        } catch (err) {
          console.error('Failed to start with camera ID:', err);
        }
      }

      if (!started) {
        // Try back camera first (most common for QR scanning)
        try {
          await scanner.start(
            { facingMode: { exact: 'environment' } }, 
            config, 
            onScanSuccess, 
            onScanError
          );
          started = true;
          const envIndex = devices.findIndex(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          if (envIndex >= 0) setCurrentCameraIndex(envIndex);
        } catch (envError) {
          console.log('Exact environment camera failed:', envError);
        }
      }

      if (!started) {
        // Try environment without exact constraint
        try {
          await scanner.start(
            { facingMode: 'environment' }, 
            config, 
            onScanSuccess, 
            onScanError
          );
          started = true;
        } catch (envError) {
          console.log('Environment camera failed:', envError);
        }
      }

      if (!started && devices && devices.length > 0) {
        // Try each device
        for (let i = 0; i < devices.length; i++) {
          try {
            await scanner.start(devices[i].id, config, onScanSuccess, onScanError);
            setCurrentCameraIndex(i);
            started = true;
            break;
          } catch (deviceErr) {
            console.log(`Device ${i} failed:`, deviceErr);
          }
        }
      }

      if (!started) {
        // Last resort: front camera
        try {
          await scanner.start(
            { facingMode: 'user' }, 
            config, 
            onScanSuccess, 
            onScanError
          );
          started = true;
        } catch (userError) {
          console.error('All camera attempts failed:', userError);
          throw new Error('Could not access any camera');
        }
      }

      if (!mountedRef.current) {
        await scanner.stop();
        return;
      }

      setHasPermission(true);
      setIsStarted(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Scanner error:', err);
      
      if (!mountedRef.current) return;
      
      setHasPermission(false);
      setIsLoading(false);
      scannerRef.current = null;
      
      const errorMessage = err.message?.toLowerCase() || '';
      const errorName = err.name || '';
      
      if (errorName === 'NotAllowedError' || errorMessage.includes('permission')) {
        setError('Camera access denied. Please allow camera access in your browser settings and refresh the page.');
      } else if (errorName === 'NotFoundError' || errorMessage.includes('no camera')) {
        setError('No camera found on this device.');
      } else if (errorName === 'NotReadableError' || errorMessage.includes('in use')) {
        setError('Camera is busy. Please close other apps using the camera and try again.');
      } else if (errorName === 'OverconstrainedError') {
        setError('Camera requirements not met. Please try again.');
      } else if (errorMessage.includes('https') || errorMessage.includes('secure')) {
        setError('Camera requires a secure connection (HTTPS). Please access this page via HTTPS.');
      } else {
        setError('Could not start camera. Please check permissions and try again.');
      }
    }
  }, [onScan, stopScanner]);

  const switchCamera = useCallback(async () => {
    if (cameras.length < 2 || isLoading) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    await stopScanner();
    setCurrentCameraIndex(nextIndex);
    
    setTimeout(() => {
      startScanner(nextCamera.id);
    }, 300);
  }, [cameras, currentCameraIndex, stopScanner, startScanner, isLoading]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
            {isLoading ? (
              <>
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <p className="text-center text-sm text-muted-foreground">
                  Starting camera...
                </p>
              </>
            ) : hasPermission === false ? (
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
                <Button onClick={() => startScanner()} className="gap-2" disabled={isScanning || isLoading}>
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
            <Button variant="outline" onClick={switchCamera} className="gap-2" disabled={isLoading}>
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
