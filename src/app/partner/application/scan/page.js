// app/partner/application/scan/page.js
'use client';
import { useState } from 'react';
import QRScanner from '../../../../components/partner-app/QRScanner/QRScanner';
import BookingCard from '../../../../components/partner-app/BookingCard/BookingCard';
import styles from './Scan.module.css';

export default function ScanPage() {
  const [scannedBooking, setScannedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scannerKey, setScannerKey] = useState(0); // For re-mounting scanner

  const handleScan = async (qrData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Scanned QR data:', qrData);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Verify the QR code with backend
      const response = await fetch('/api/partner/application/verify-qr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingReference: qrData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.notFound) {
          throw new Error('Booking not found');
        } else if (data.wrongStation) {
          throw new Error('This booking is not for your station');
        }
        throw new Error(data.error || 'Verification failed');
      }

      console.log('✅ Booking verified:', data.booking);
      setScannedBooking(data.booking);
    } catch (err) {
      console.error('Scan error:', err);
      setError(err.message);
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setError(null);
        setScannerKey(prev => prev + 1); // Reset scanner
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (booking) => {
    const isDropOff = booking.status === 'pending' || booking.status === 'confirmed';
    const actionType = isDropOff ? 'drop-off' : 'pick-up';
    const endpoint = isDropOff ? '/api/partner/application/confirm-dropoff' : '/api/partner/application/confirm-pickup';

    const confirmed = window.confirm(
      `Confirm ${actionType} for ${booking.fullName}?\n\n` +
      `${booking.luggageCount} bag(s)\n` +
      `Ref: ${booking.bookingReference}`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingReference: booking.bookingReference
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to confirm ${actionType}`);
      }

      alert(`✅ ${actionType.charAt(0).toUpperCase() + actionType.slice(1)} confirmed successfully!`);
      
      // Reset scanner
      setScannedBooking(null);
      setScannerKey(prev => prev + 1);
    } catch (err) {
      console.error(`Confirm ${actionType} error:`, err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScanAnother = () => {
    setScannedBooking(null);
    setError(null);
    setScannerKey(prev => prev + 1); // Re-mount scanner
  };

  const getActionLabel = (booking) => {
    if (booking.status === 'pending' || booking.status === 'confirmed') {
      return 'Confirm Drop-off';
    } else if (booking.status === 'stored') {
      return 'Confirm Pick-up';
    } else if (booking.status === 'completed') {
      return 'Already Completed';
    }
    return 'View Details';
  };

  const getActionVariant = (booking) => {
    if (booking.status === 'pending' || booking.status === 'confirmed') {
      return 'primary';
    } else if (booking.status === 'stored') {
      return 'success';
    }
    return 'primary';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📷 Scan QR Code</h1>
        <p className={styles.subtitle}>
          Scan the customer&apos;s booking QR code to verify and confirm
        </p>
      </div>

      {!scannedBooking && !error && (
        <div className={styles.scannerSection}>
          <QRScanner key={scannerKey} onScan={handleScan} />
        </div>
      )}

      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Verifying booking...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>❌</div>
          <h3 className={styles.errorTitle}>Verification Failed</h3>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.retryButton} onClick={handleScanAnother}>
            Scan Another
          </button>
        </div>
      )}

      {scannedBooking && !loading && (
        <div className={styles.resultSection}>
          <div className={styles.resultHeader}>
            <h3 className={styles.resultTitle}>✅ Booking Verified</h3>
          </div>

          <BookingCard
            booking={scannedBooking}
            onAction={
              scannedBooking.status !== 'completed' 
                ? handleConfirmAction 
                : null
            }
            actionLabel={getActionLabel(scannedBooking)}
            actionVariant={getActionVariant(scannedBooking)}
          />

          <button className={styles.scanAnotherButton} onClick={handleScanAnother}>
            Scan Another Booking
          </button>
        </div>
      )}
    </div>
  );
}