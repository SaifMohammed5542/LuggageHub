// app/partner/application/dashboard/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TodayBookings from '../../../../components/partner-app/TodayBookings/TodayBookings';
import styles from './Dashboard.module.css';

export default function PartnerAppDashboard() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, booking: null, type: null });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch('/api/partner/application/earnings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (!d.error) setEarnings(d); })
      .catch(() => {});
  }, []);

  const openConfirm = (booking, type) => setConfirmModal({ open: true, booking, type });
  const closeConfirm = () => setConfirmModal({ open: false, booking: null, type: null });

  const handleConfirmDropoff = async (booking) => openConfirm(booking, 'dropoff');
  const handleConfirmPickup  = async (booking) => openConfirm(booking, 'pickup');

  const executeConfirm = async () => {
    const { booking, type } = confirmModal;
    closeConfirm();
    if (confirming) return;
    setConfirming(true);
    try {
      const endpoint = type === 'dropoff'
        ? '/api/partner/application/confirm-dropoff'
        : '/api/partner/application/confirm-pickup';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingReference: booking.bookingReference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(type === 'dropoff' ? `Drop-off confirmed for ${booking.fullName}` : `Pick-up confirmed for ${booking.fullName}`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConfirming(false);
    }
  };

  const fmt = n => `A$${Number(n).toFixed(2)}`;

  return (
    <div className={styles.container}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, borderRadius: 10, padding: '12px 20px',
          background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          color: '#fff', fontWeight: 600, fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxWidth: '90vw', textAlign: 'center',
        }}>
          {toast.type === 'error' ? '⛔ ' : '✅ '}{toast.msg}
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.55)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>
              {confirmModal.type === 'dropoff' ? '📥' : '📤'}
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, textAlign: 'center', marginBottom: 8 }}>
              Confirm {confirmModal.type === 'dropoff' ? 'Drop-off' : 'Pick-up'}
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 14 }}>
              <div><strong>{confirmModal.booking?.fullName}</strong></div>
              <div style={{ color: '#6b7280', marginTop: 4 }}>
                {confirmModal.booking?.smallBagCount ?? 0} small · {confirmModal.booking?.largeBagCount ?? 0} large
              </div>
              <div style={{ color: '#6b7280' }}>Ref: {confirmModal.booking?.bookingReference}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeConfirm} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={executeConfirm} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                background: confirmModal.type === 'dropoff' ? '#0284C7' : '#16a34a',
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>📦 Today&apos;s Bookings</h1>
        <p className={styles.welcomeText}>View and manage today&apos;s drop-offs and pick-ups</p>
      </div>

      {/* Earnings snapshot */}
      {earnings && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, padding: '0 4px' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>This Month</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#0284C7' }}>{fmt(earnings.earningsThisMonth)}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Outstanding</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: earnings.outstanding > 0 ? '#d97706' : '#16a34a' }}>
              {fmt(earnings.outstanding)}
            </div>
          </div>
          {earnings.bonusProgress?.filter(b => !b.earned).map(offer => {
            const pct = Math.round((offer.current / offer.threshold) * 100);
            return (
              <div key={offer.offerId} style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>🎁 {offer.name}</span>
                  <span style={{ color: '#6b7280' }}>{offer.current}/{offer.threshold} → A${offer.rewardAmount}</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#0284C7', borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
              </div>
            );
          })}
          {earnings.bonusProgress?.filter(b => b.earned).map(offer => (
            <div key={offer.offerId} style={{ gridColumn: '1 / -1', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <span><strong>{offer.name}</strong> earned! A${offer.rewardAmount} bonus</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.quickActions}>
        <button className={styles.actionCard} onClick={() => router.push('/partner/application/scan')}>
          <span className={styles.actionIcon}>📷</span>
          <span className={styles.actionLabel}>Scan QR Code</span>
        </button>
        <button className={styles.actionCard} onClick={() => router.push('/partner/application/history')}>
          <span className={styles.actionIcon}>📋</span>
          <span className={styles.actionLabel}>View History</span>
        </button>
      </div>

      <TodayBookings onConfirmDropoff={handleConfirmDropoff} onConfirmPickup={handleConfirmPickup} />

      {confirming && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
}
