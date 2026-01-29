// components/partner-app/BookingCard.js
'use client';
import styles from './BookingCard.module.css';

/**
 * BookingCard Component
 * Displays booking information in a card format
 */
export default function BookingCard({ booking, onAction, actionLabel, actionVariant = 'primary' }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Pending Drop-off', className: styles.statusPending },
      confirmed: { label: 'Pending Drop-off', className: styles.statusPending },
      stored: { label: 'Stored', className: styles.statusStored },
      completed: { label: 'Completed', className: styles.statusCompleted },
      cancelled: { label: 'Cancelled', className: styles.statusCancelled }
    };

    const statusInfo = statusMap[status] || { label: status, className: styles.statusDefault };
    
    return (
      <span className={`${styles.statusBadge} ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.customerName}>{booking.fullName}</div>
        {getStatusBadge(booking.status)}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.label}>📧 Email:</span>
          <span className={styles.value}>{booking.email}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>📱 Phone:</span>
          <span className={styles.value}>{booking.phone}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>🎒 Small Bags:</span>
          <span className={styles.value}>{booking.smallBagCount || 0}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>🧳 Large Bags:</span>
          <span className={styles.value}>{booking.largeBagCount || 0}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>📦 Total Bags:</span>
          <span className={styles.valueHighlight}>{booking.luggageCount}</span>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.infoRow}>
          <span className={styles.label}>📅 Drop-off:</span>
          <span className={styles.value}>{formatDate(booking.dropOffDate)}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>📦 Pick-up:</span>
          <span className={styles.value}>{formatDate(booking.pickUpDate)}</span>
        </div>

        {booking.checkInTime && (
          <div className={styles.infoRow}>
            <span className={styles.label}>✅ Checked In:</span>
            <span className={styles.value}>{formatDate(booking.checkInTime)}</span>
          </div>
        )}

        {booking.totalAmount && (
          <div className={styles.infoRow}>
            <span className={styles.label}>💰 Amount:</span>
            <span className={styles.valueHighlight}>A${Number(booking.totalAmount).toFixed(2)}</span>
          </div>
        )}

        {booking.specialInstructions && (
          <>
            <div className={styles.divider}></div>
            <div className={styles.instructions}>
              <span className={styles.label}>📝 Instructions:</span>
              <p className={styles.instructionsText}>{booking.specialInstructions}</p>
            </div>
          </>
        )}
      </div>

      {onAction && actionLabel && (
        <div className={styles.cardFooter}>
          <button 
            className={`${styles.actionButton} ${styles[actionVariant]}`}
            onClick={() => onAction(booking)}
          >
            {actionLabel}
          </button>
        </div>
      )}

      <div className={styles.cardReference}>
        Ref: <code className={styles.refCode}>{booking.bookingReference}</code>
      </div>
    </div>
  );
}