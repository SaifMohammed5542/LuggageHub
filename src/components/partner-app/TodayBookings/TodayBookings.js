// components/partner-app/TodayBookings.js
'use client';
import { useEffect, useState } from 'react';
import BookingCard from '../BookingCard/BookingCard';
import styles from './TodayBookings.module.css';

/**
 * TodayBookings Component
 * Displays today's drop-offs and pick-ups
 */
export default function TodayBookings({ onConfirmDropoff, onConfirmPickup }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropOffs, setDropOffs] = useState([]);
  const [pickUps, setPickUps] = useState([]);
  const [activeTab, setActiveTab] = useState('dropoffs'); // 'dropoffs' or 'pickups'

  const fetchTodayBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/partner/application/today-bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch today\'s bookings');
      }

      setDropOffs(data.todayDropOffs || []);
      setPickUps(data.todayPickUps || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayBookings();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchTodayBookings, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchTodayBookings();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading today&apos;s bookings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>❌ {error}</p>
        <button className={styles.retryButton} onClick={handleRefresh}>
          Try Again
        </button>
      </div>
    );
  }

  const hasDropOffs = dropOffs.length > 0;
  const hasPickUps = pickUps.length > 0;
  const hasBookings = hasDropOffs || hasPickUps;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Today&apos;s Bookings</h2>
        <button className={styles.refreshButton} onClick={handleRefresh}>
          🔄 Refresh
        </button>
      </div>

      {!hasBookings && (
        <div className={styles.emptyState}>
          <p className={styles.emptyIcon}>📭</p>
          <p className={styles.emptyText}>No bookings scheduled for today</p>
          <p className={styles.emptySubtext}>Check back later or use the scanner for walk-ins</p>
        </div>
      )}

      {hasBookings && (
        <>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'dropoffs' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('dropoffs')}
            >
              📦 Drop-offs ({dropOffs.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'pickups' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('pickups')}
            >
              🎒 Pick-ups ({pickUps.length})
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'dropoffs' && (
              <div className={styles.bookingsList}>
                {!hasDropOffs ? (
                  <p className={styles.emptyTabText}>No drop-offs scheduled for today</p>
                ) : (
                  dropOffs.map((booking) => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onAction={onConfirmDropoff}
                      actionLabel="Confirm Drop-off"
                      actionVariant="primary"
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'pickups' && (
              <div className={styles.bookingsList}>
                {!hasPickUps ? (
                  <p className={styles.emptyTabText}>No pick-ups scheduled for today</p>
                ) : (
                  pickUps.map((booking) => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onAction={onConfirmPickup}
                      actionLabel="Confirm Pick-up"
                      actionVariant="success"
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}