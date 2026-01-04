"use client";

import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import QRCode from "qrcode";

interface DigitalSealPreviewProps {
  officeName?: string;
  officeTitle?: string;
  serialPrefix?: string;
  signatureText?: string;
  signatureImage?: string;
  serialNumber?: string;
  timestamp?: string;
  size?: number;
  showQR?: boolean;
  verificationBaseUrl?: string;
}

export interface DigitalSealPreviewHandle {
  getCanvas: () => HTMLCanvasElement | null;
  download: (filename?: string) => void;
}

export const DigitalSealPreview = forwardRef<DigitalSealPreviewHandle, DigitalSealPreviewProps>(({
  officeName = "NIGERIAN PORTS AUTHORITY",
  officeTitle = "OFFICE OF THE MANAGING DIRECTOR",
  serialPrefix = "NPA-MD",
  signatureText = "Signature",
  signatureImage,
  serialNumber,
  timestamp,
  size = 350,
  showQR = true,
  verificationBaseUrl,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagesReady, setImagesReady] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const signatureRef = useRef<HTMLImageElement | null>(null);
  const qrRef = useRef<HTMLImageElement | null>(null);

  // Memoize serial to prevent regeneration on every render
  const serial = useMemo(() => {
    if (serialNumber) return serialNumber;
    return `${serialPrefix}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
  }, [serialNumber, serialPrefix]);

  // Expose canvas and download method via ref
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    download: (filename?: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `seal-${serialPrefix}-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  }), [serialPrefix]);

  const dateTime = useMemo(() => {
    if (timestamp) return timestamp;
    return new Date().toLocaleString("en-NG", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }, [timestamp]);

  // Memoize verification URL
  const verificationUrl = useMemo(() => {
    const baseUrl = verificationBaseUrl || (typeof window !== 'undefined' ? `${window.location.origin}/verify` : '/verify');
    return `${baseUrl}/${serial}`;
  }, [verificationBaseUrl, serial]);

  // Generate QR code - only when URL changes
  useEffect(() => {
    if (!showQR) return;
    
    let cancelled = false;
    
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 200,
          margin: 0,
          color: {
            dark: '#1e3a5f',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        
        // Load QR as image
        const qrImg = new Image();
        qrImg.onload = () => {
          if (!cancelled) {
            qrRef.current = qrImg;
            // Use a counter to force redraw without infinite loop
            setImagesReady(prev => true);
          }
        };
        qrImg.src = dataUrl;
      } catch (err) {
        logError('Failed to generate QR code:', err);
      }
    };
    
    generateQR();
    
    return () => {
      cancelled = true;
    };
  }, [verificationUrl, showQR]);

  // Load NPA logo - try PNG first (better canvas compatibility), fallback to SVG
  useEffect(() => {
    let cancelled = false;
    
    const tryLoadLogo = (src: string, fallbackSrc?: string) => {
      const logo = new Image();
      // Only set crossOrigin for external URLs
      if (src.startsWith('http')) {
        logo.crossOrigin = "anonymous";
      }
      logo.onload = () => {
        if (!cancelled) {
          logoRef.current = logo;
          setImagesReady(true);
          logInfo('Logo loaded successfully:', src);
        }
      };
      logo.onerror = () => {
        if (!cancelled) {
          if (fallbackSrc) {
            // Try fallback
            logInfo('Logo failed, trying fallback:', fallbackSrc);
            tryLoadLogo(fallbackSrc);
          } else {
            logWarn('Failed to load NPA logo - using placeholder');
            setImagesReady(true); // Continue with placeholder
          }
        }
      };
      logo.src = src;
    };
    
    // Try PNG first (better canvas compatibility), then SVG as fallback
    // NOTE: For best results, export npalogo.svg to npalogo.png with transparent background
    tryLoadLogo("/npalogo.png", "/npalogo.svg");

    return () => {
      cancelled = true;
    };
  }, []);

  // Load signature image - only when it changes
  useEffect(() => {
    if (!signatureImage) {
      signatureRef.current = null;
      return;
    }
    
    let cancelled = false;
    
    const sig = new Image();
    // Only set crossOrigin for external URLs
    if (signatureImage.startsWith('http')) {
      sig.crossOrigin = "anonymous";
    }
    sig.onload = () => {
      if (!cancelled) {
        signatureRef.current = sig;
        setImagesReady(prev => true);
        logInfo('Signature loaded successfully:', signatureImage);
      }
    };
    sig.onerror = (error) => {
      if (!cancelled) {
        logWarn('Failed to load signature image:', signatureImage, error);
        signatureRef.current = null;
        setImagesReady(prev => true); // Continue without signature
      }
    };
    sig.src = signatureImage;

    return () => {
      cancelled = true;
    };
  }, [signatureImage]);

  // Draw canvas - debounced to prevent excessive redraws
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // HIGH DPI / RETINA SUPPORT
    const scale = 4;
    const scaledSize = size * scale;
    
    canvas.width = scaledSize;
    canvas.height = scaledSize;
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 5;
    const bandWidth = size * 0.095;
    const innerRadius = outerRadius - bandWidth;
    const textRadius = outerRadius - bandWidth / 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // White background circle
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw curved text - Top
    ctx.save();
    ctx.font = `900 ${size * 0.055}px "Arial Black", Arial, sans-serif`;
    ctx.fillStyle = "#1e3a5f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const topText = officeName;
    const topAngleStart = -Math.PI * 0.80;
    const topAngleEnd = -Math.PI * 0.20;
    const topAngleStep = (topAngleEnd - topAngleStart) / (topText.length - 1);
    
    for (let i = 0; i < topText.length; i++) {
      const angle = topAngleStart + i * topAngleStep;
      const x = centerX + textRadius * Math.cos(angle);
      const y = centerY + textRadius * Math.sin(angle);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(topText[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // Draw curved text - Bottom
    ctx.save();
    ctx.font = `900 ${size * 0.040}px "Arial Black", Arial, sans-serif`;
    ctx.fillStyle = "#1e3a5f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const bottomText = officeTitle;
    const bottomAngleStart = Math.PI * 0.83;
    const bottomAngleEnd = Math.PI * 0.17;
    const bottomAngleStep = (bottomAngleEnd - bottomAngleStart) / (bottomText.length - 1);
    
    for (let i = 0; i < bottomText.length; i++) {
      const angle = bottomAngleStart + i * bottomAngleStep;
      const x = centerX + textRadius * Math.cos(angle);
      const y = centerY + textRadius * Math.sin(angle);
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle - Math.PI / 2);
      ctx.fillText(bottomText[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // Stars
    ctx.font = `900 ${size * 0.07}px Arial`;
    ctx.fillStyle = "#1e3a5f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", centerX - textRadius, centerY);
    ctx.fillText("★", centerX + textRadius, centerY);

    // NPA Logo
    const logoSize = size * 0.28;
    const logoY = centerY - size * 0.18;
    
    if (logoRef.current) {
      ctx.drawImage(
        logoRef.current,
        centerX - logoSize / 2,
        logoY - logoSize / 2,
        logoSize,
        logoSize
      );
    } else {
      // Placeholder
      ctx.beginPath();
      ctx.arc(centerX, logoY, logoSize / 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "#f0f4f8";
      ctx.fill();
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.font = `900 ${size * 0.08}px "Arial Black", Arial`;
      ctx.fillStyle = "#1e3a5f";
      ctx.textAlign = "center";
      ctx.fillText("NPA", centerX, logoY);
    }

    // Signature
    const sigY = centerY + size * 0.06;
    const sigHeight = size * 0.10;
    const sigWidth = size * 0.45;
    
    if (signatureRef.current) {
      ctx.drawImage(
        signatureRef.current,
        centerX - sigWidth / 2,
        sigY - sigHeight / 2,
        sigWidth,
        sigHeight
      );
    } else {
      ctx.font = `italic 700 ${size * 0.08}px "Brush Script MT", "Segoe Script", cursive`;
      ctx.fillStyle = "#1a1a2e";
      ctx.textAlign = "center";
      ctx.fillText(signatureText, centerX, sigY);
    }

    // DIGITALLY APPROVED
    ctx.font = `900 ${size * 0.032}px "Arial Black", Arial, sans-serif`;
    ctx.fillStyle = "#1e3a5f";
    ctx.textAlign = "center";
    ctx.fillText("DIGITALLY APPROVED", centerX, centerY + size * 0.16);

    // Serial number
    ctx.font = `bold ${size * 0.026}px "Consolas", "Monaco", monospace`;
    ctx.fillText(serial, centerX, centerY + size * 0.20);

    // QR Code
    if (showQR && qrRef.current) {
      const qrSize = size * 0.10;
      const qrY = centerY + size * 0.24;
      ctx.drawImage(
        qrRef.current,
        centerX - qrSize / 2,
        qrY,
        qrSize,
        qrSize
      );
    } else if (showQR) {
      // Placeholder
      const qrSize = size * 0.08;
      const qrY = centerY + size * 0.25;
      
      ctx.fillStyle = "white";
      ctx.fillRect(centerX - qrSize / 2 - 2, qrY - 2, qrSize + 4, qrSize + 4);
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 1;
      ctx.strokeRect(centerX - qrSize / 2 - 2, qrY - 2, qrSize + 4, qrSize + 4);
      
      ctx.fillStyle = "#1e3a5f";
      const cellSize = qrSize / 7;
      const qrPattern = [
        [1,1,1,0,1,1,1],
        [1,0,1,0,1,0,1],
        [1,1,1,0,1,1,1],
        [0,0,0,0,0,0,0],
        [1,1,1,0,1,0,1],
        [1,0,1,0,0,1,0],
        [1,1,1,0,1,0,1],
      ];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
          if (qrPattern[row][col]) {
            ctx.fillRect(
              Math.floor(centerX - qrSize / 2 + col * cellSize),
              Math.floor(qrY + row * cellSize),
              Math.ceil(cellSize - 0.5),
              Math.ceil(cellSize - 0.5)
            );
          }
        }
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);

  }, [size, officeName, officeTitle, signatureText, serial, showQR, imagesReady]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        style={{ 
          width: size, 
          height: size,
          imageRendering: "auto"
        }}
        className="rounded-full shadow-lg"
      />
      <div className="text-center text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{officeTitle}</p>
        <p className="font-mono text-xs">{serial}</p>
        {showQR && (
          <p className="text-xs mt-1 text-primary">
            Scan QR to verify
          </p>
        )}
      </div>
    </div>
  );
});

DigitalSealPreview.displayName = "DigitalSealPreview";

// Export default for compatibility
export default DigitalSealPreview;
