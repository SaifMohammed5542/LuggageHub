// app/partner/application/dashboard/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TodayBookings from '../../../../components/partner-app/TodayBookings/TodayBookings';
import styles from './Dashboard.module.css';

export default function PartnerAppDashboard() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const handleConfirmDropoff = async (booking) => {
    if (confirming) return;

    const confirmed = window.confirm(
      `Confirm drop-off for ${booking.fullName}?\n\n` +
      `${booking.luggageCount} bag(s)\n` +
      `Ref: ${booking.bookingReference}`
    );

    if (!confirmed) return;

    setConfirming(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/partner/application/confirm-dropoff', {
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
        throw new Error(data.error || 'Failed to confirm drop-off');
      }

      alert(`✅ Drop-off confirmed for ${booking.fullName}`);
      
      // Refresh the page to update the bookings list
      window.location.reload();
    } catch (err) {
      console.error('Confirm drop-off error:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmPickup = async (booking) => {
    if (confirming) return;

    const confirmed = window.confirm(
      `Confirm pick-up for ${booking.fullName}?\n\n` +
      `${booking.luggageCount} bag(s)\n` +
      `Ref: ${booking.bookingReference}`
    );

    if (!confirmed) return;

    setConfirming(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/partner/application/confirm-pickup', {
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
        throw new Error(data.error || 'Failed to confirm pick-up');
      }

      alert(`✅ Pick-up confirmed for ${booking.fullName}`);
      
      // Refresh the page to update the bookings list
      window.location.reload();
    } catch (err) {
      console.error('Confirm pick-up error:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>📦 Today&apos;s Bookings</h1>
        <p className={styles.welcomeText}>
          View and manage today&apos;s drop-offs and pick-ups
        </p>
      </div>

      <div className={styles.quickActions}>
        <button
          className={styles.actionCard}
          onClick={() => router.push('/partner/application/scan')}
        >
          <span className={styles.actionIcon}>📷</span>
          <span className={styles.actionLabel}>Scan QR Code</span>
        </button>

        <button
          className={styles.actionCard}
          onClick={() => router.push('/partner/application/history')}
        >
          <span className={styles.actionIcon}>📋</span>
          <span className={styles.actionLabel}>View History</span>
        </button>
      </div>

      <TodayBookings
        onConfirmDropoff={handleConfirmDropoff}
        onConfirmPickup={handleConfirmPickup}
      />

      {confirming && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
}