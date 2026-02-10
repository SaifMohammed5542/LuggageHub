// components/partner-app/BookingCard.js
'use client';
import styles from './BookingCard.module.css';

const PARTNER_SHARE = 0.4; // 40% partner share

/**
 * BookingCard Component
 * Displays booking information in a card format
 */
export default function BookingCard({ booking, onAction, actionLabel, actionVariant = 'primary' }) {
 // ✅ NO TIMEZONE CONVERSION - Display exact time user selected
const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // Use UTC methods to avoid timezone conversion
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const dayOfWeek = dayNames[date.getUTCDay()];
  const monthName = monthNames[month];
  
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const minuteStr = minutes.toString().padStart(2, '0');
  
  return `${dayOfWeek}, ${monthName} ${day}, ${year} ${hour12}:${minuteStr} ${ampm}`;
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

  // Calculate partner share (40%)
  const calculatePartnerShare = (booking) => {
    if (!booking.totalAmount) return 0;
    
    const totalAmount = Number(booking.totalAmount);
    const partnerShare = totalAmount * PARTNER_SHARE;
    
    return partnerShare;
  };

  const partnerShare = calculatePartnerShare(booking);

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

        {/* ✅ SHOW ONLY PARTNER SHARE (40%) */}
        {partnerShare > 0 && (
          <div className={styles.infoRow}>
            <span className={styles.label}>💰 Your Share (40%):</span>
            <span className={styles.valueHighlight}>A${partnerShare.toFixed(2)}</span>
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