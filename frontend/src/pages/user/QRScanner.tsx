import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, Loader2, QrCode, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QR_READER_ID = 'induction-qr-scanner';

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppingRef = useRef(false);
  const scannedRef = useRef(false);
  const mountedRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || stoppingRef.current) return;
    stoppingRef.current = true;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (err: any) {
      if (!String(err?.message || err).includes('scanner is not running or paused')) {
        console.warn('[QRScanner] Failed to stop scanner:', err);
      }
    } finally {
      try {
        await scanner.clear();
      } catch {
        // The reader element may already be gone during route cleanup.
      }
      if (scannerRef.current === scanner) scannerRef.current = null;
      stoppingRef.current = false;
      if (mountedRef.current) setStarted(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const scanner = new Html5Qrcode(QR_READER_ID);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        await stopScanner();
        onScan(decodedText);
      },
      () => undefined,
    ).then(async () => {
      if (!mountedRef.current) {
        try {
          if (scanner.isScanning) await scanner.stop();
          await scanner.clear();
        } catch {
          // Component unmounted while camera was starting.
        }
        return;
      }
      setStarted(true);
    }).catch((err) => {
      if (!mountedRef.current) return;
      const message = String(err?.message || err || '');
      setError(
        message.toLowerCase().includes('permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not start camera. Close this window and try again.',
      );
    });

    return () => {
      mountedRef.current = false;
      void stopScanner();
    };
  }, [onScan, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Scan QR Code</span>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={handleClose}
                className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200"
                type="button">
                Close Scanner
              </button>
            </div>
          ) : (
            <>
              <div
                id={QR_READER_ID}
                className="rounded-xl overflow-hidden bg-gray-900"
                style={{ minHeight: 280 }}
              />
              {!started && (
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting camera...
                </div>
              )}
              {started && (
                <p className="text-center text-xs text-gray-500 mt-3">
                  Point your camera at the QR code shown by your trainer
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
