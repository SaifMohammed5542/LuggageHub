// app/partner/application/scan/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './Scan.module.css';

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // ✅ AUTO-START SCANNER WITH REAR CAMERA IMMEDIATELY
    let scanner = null;

    const startScanner = () => {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          // ✅ FORCE REAR CAMERA (environment-facing)
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true, // Show flash toggle if available
          // ✅ CRITICAL: This hides all camera selection UI
          rememberLastUsedCamera: false,
          showZoomSliderIfSupported: false,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          setResult(decodedText);
          setScanning(false);
          scanner.clear();
        },
        (errorMessage) => {
          // Ignore continuous scan errors (they're normal)
          console.log('Scan error:', errorMessage);
        }
      );

      setScanning(true);
    };

    // ✅ AUTO-START ON MOUNT
    startScanner();

    // Cleanup
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, []);

  const handleConfirmDropoff = async () => {
    if (!result || processing) return;

    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/partner/application/confirm-dropoff', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingReference: result,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm drop-off');
      }

      alert(`✅ Drop-off confirmed for booking: ${result}`);
      router.push('/partner/application/dashboard');
    } catch (err) {
      console.error('Confirm drop-off error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!result || processing) return;

    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/partner/application/confirm-pickup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingReference: result,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm pick-up');
      }

      alert(`✅ Pick-up confirmed for booking: ${result}`);
      router.push('/partner/application/dashboard');
    } catch (err) {
      console.error('Confirm pick-up error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setError('');
    window.location.reload(); // Reload to restart scanner
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push('/partner/application/dashboard')}>
          ← Back
        </button>
        <h1 className={styles.title}>📷 Scan QR Code</h1>
      </div>

      {!result ? (
        <div className={styles.scannerSection}>
          <p className={styles.instruction}>
            Position the QR code within the frame
          </p>
          
          {/* ✅ SCANNER CONTAINER - NO UI CONTROLS */}
          <div id="qr-reader" className={styles.qrReader}></div>

          <p className={styles.hint}>
            💡 Make sure the QR code is well-lit and in focus
          </p>
        </div>
      ) : (
        <div className={styles.resultSection}>
          <div className={styles.successBanner}>
            <div className={styles.successIcon}>✅</div>
            <div className={styles.successTitle}>QR Code Scanned!</div>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultLabel}>Booking Reference:</div>
            <div className={styles.resultValue}>{result}</div>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorText}>{error}</div>
            </div>
          )}

          <div className={styles.actionButtons}>
            <button
              className={styles.dropoffButton}
              onClick={handleConfirmDropoff}
              disabled={processing}
            >
              {processing ? 'Processing...' : '📥 Confirm Drop-off'}
            </button>

            <button
              className={styles.pickupButton}
              onClick={handleConfirmPickup}
              disabled={processing}
            >
              {processing ? 'Processing...' : '📤 Confirm Pick-up'}
            </button>

            <button
              className={styles.scanAgainButton}
              onClick={handleScanAgain}
              disabled={processing}
            >
              🔄 Scan Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}