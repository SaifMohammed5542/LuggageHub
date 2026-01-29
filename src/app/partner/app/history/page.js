// app/partner/app/history/page.js
'use client';
import { useEffect, useState } from 'react';
import BookingCard from '../../../../components/partner-app/BookingCard/BookingCard';
import styles from './History.module.css';

export default function HistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'stored', 'completed'

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      if (!token || !userId) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/partner/${userId}/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'pending') return booking.status === 'pending' || booking.status === 'confirmed';
    return booking.status === filter;
  });

  const getFilterCount = (status) => {
    if (status === 'all') return bookings.length;
    if (status === 'pending') return bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
    return bookings.filter(b => b.status === status).length;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading booking history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>❌ {error}</p>
        <button className={styles.retryButton} onClick={fetchBookings}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📋 Booking History</h1>
        <p className={styles.subtitle}>
          All bookings for your station
        </p>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filter === 'all' ? styles.filterActive : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({getFilterCount('all')})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'pending' ? styles.filterActive : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({getFilterCount('pending')})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'stored' ? styles.filterActive : ''}`}
          onClick={() => setFilter('stored')}
        >
          Stored ({getFilterCount('stored')})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'completed' ? styles.filterActive : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({getFilterCount('completed')})
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyIcon}>📭</p>
          <p className={styles.emptyText}>
            {filter === 'all' 
              ? 'No bookings found'
              : `No ${filter} bookings`
            }
          </p>
        </div>
      ) : (
        <div className={styles.bookingsList}>
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking._id}
              booking={booking}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.refreshButton} onClick={fetchBookings}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}