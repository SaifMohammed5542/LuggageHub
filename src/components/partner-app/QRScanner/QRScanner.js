// components/partner-app/QRScanner.js
'use client';
import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './QRScanner.module.css';

/**
 * QRScanner Component
 * Uses device camera to scan QR codes
 * Returns scanned booking reference via onScan callback
 */
export default function QRScanner({ onScan }) {
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let scanner = null;

    const initScanner = () => {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          formatsToSupport: [0] // Only QR codes
        },
        false
      );

      scanner.render(
        (decodedText) => {
          console.log('✅ QR Code scanned:', decodedText);
          setIsScanning(false);
          
          // Stop scanner after successful scan
          scanner.clear().catch(err => console.error('Scanner clear error:', err));
          
          // Call the onScan callback with the scanned text
          if (onScan) {
            onScan(decodedText);
          }
        },
        (error) => {
          // Silent error handling (scanning in progress)
          // Only log if it's not the standard "No QR code found" message
          if (!error.includes('No MultiFormat Readers')) {
            console.debug('QR scan error:', error);
          }
        }
      );

      setIsScanning(true);
    };

    // Initialize scanner
    initScanner();

    // Cleanup
    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error('Cleanup error:', err));
      }
    };
  }, [onScan]);

  return (
    <div className={styles.scannerContainer}>
      <div className={styles.scannerWrapper}>
        <div id="qr-reader" className={styles.qrReader}></div>
      </div>
      
      {isScanning && (
        <div className={styles.instructions}>
          <p className={styles.instructionText}>
            📱 Point your camera at the QR code
          </p>
          <p className={styles.instructionSubtext}>
            Make sure the QR code is well-lit and centered
          </p>
        </div>
      )}
    </div>
  );
}