import QRCode from 'qrcode';

export async function generateQRCodeWithImage(
  data: string,
  imageUrl?: string
): Promise<string> {
  // Generate base QR code
  const qrDataUrl = await QRCode.toDataURL(data, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1e3a5f',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H', // High error correction to accommodate center image
  });

  // Create canvas to add image and ID text
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(qrDataUrl);
      return;
    }

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    
    qrImg.onload = () => {
      // Add extra height for the ID text at the bottom
      const textHeight = 40;
      canvas.width = qrImg.width;
      canvas.height = qrImg.height + textHeight;
      
      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(qrImg, 0, 0);
      
      // Draw ID text at the bottom
      ctx.fillStyle = '#1e3a5f';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ID: ${data}`, canvas.width / 2, qrImg.height + textHeight / 2);

      if (!imageUrl) {
        resolve(canvas.toDataURL('image/png'));
        return;
      }

      // Load guest image
      const guestImg = new Image();
      guestImg.crossOrigin = 'anonymous';
      
      guestImg.onload = () => {
        // Calculate center position and size (20% of QR code)
        const size = qrImg.width * 0.22;
        const x = (qrImg.width - size) / 2;
        const y = (qrImg.height - size) / 2;

        // Draw white circle background
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Draw circular guest image
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(guestImg, x, y, size, size);
        ctx.restore();

        // Add border
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 2;
        ctx.stroke();

        resolve(canvas.toDataURL('image/png'));
      };

      guestImg.onerror = () => {
        // If guest image fails to load, just return QR with ID text
        resolve(canvas.toDataURL('image/png'));
      };

      guestImg.src = imageUrl;
    };

    qrImg.onerror = () => {
      reject(new Error('Failed to load QR code image'));
    };

    qrImg.src = qrDataUrl;
  });
}

export function downloadQRCode(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
