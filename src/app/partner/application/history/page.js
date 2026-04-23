// app/partner/application/history/page.js
'use client';
import { useEffect, useState } from 'react';
import BookingCard from '../../../../components/partner-app/BookingCard/BookingCard';
import styles from './History.module.css';

export default function HistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use cookie auth (consistent with rest of PWA)
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('Not authenticated');
      const res = await fetch(`/api/partner/${userId}/bookings`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch bookings');
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilterCount = (status) => {
    if (status === 'all') return bookings.length;
    if (status === 'pending') return bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
    return bookings.filter(b => b.status === status).length;
  };

  const q = search.trim().toLowerCase();
  const filteredBookings = bookings.filter(b => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'pending' ? (b.status === 'pending' || b.status === 'confirmed') :
      b.status === filter;
    if (!matchesFilter) return false;
    if (!q) return true;
    return (
      (b.fullName || '').toLowerCase().includes(q) ||
      (b.email || '').toLowerCase().includes(q) ||
      (b.bookingReference || '').toLowerCase().includes(q) ||
      (() => { const d = new Date(b.dropOffDate); return `${d.getUTCDate()}/${d.getUTCMonth()+1}/${d.getUTCFullYear()}`; })().includes(q)
    );
  });

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <p>Loading booking history...</p>
    </div>
  );

  if (error) return (
    <div className={styles.errorContainer}>
      <p className={styles.errorText}>❌ {error}</p>
      <button className={styles.retryButton} onClick={fetchBookings}>Try Again</button>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📋 Booking History</h1>
        <p className={styles.subtitle}>All bookings for your station</p>
      </div>

      {/* Search */}
      <div style={{ padding: '0 0 12px' }}>
        <input
          type="text"
          placeholder="Search name, email, date, ref…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, border: '1px solid #d1d5db', padding: '10px 14px', fontSize: 14 }}
        />
      </div>

      {/* Filters */}
      <div className={styles.filters} style={{ flexWrap: 'wrap', gap: 6 }}>
        {['all', 'pending', 'stored', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            className={`${styles.filterButton} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({getFilterCount(f)})
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyIcon}>📭</p>
          <p className={styles.emptyText}>
            {q ? `No bookings match "${search}"` : filter === 'all' ? 'No bookings found' : `No ${filter} bookings`}
          </p>
        </div>
      ) : (
        <div className={styles.bookingsList}>
          {filteredBookings.map(booking => (
            <BookingCard key={booking._id} booking={booking} />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.refreshButton} onClick={fetchBookings}>🔄 Refresh</button>
      </div>
    </div>
  );
}
