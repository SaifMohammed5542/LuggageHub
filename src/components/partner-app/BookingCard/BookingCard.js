// components/partner-app/BookingCard/BookingCard.js
'use client';
import { useState } from 'react';
import styles from './BookingCard.module.css';

const PARTNER_SHARE = 0.4; // 40% partner share

export default function BookingCard({ booking, onAction, actionLabel, actionVariant = 'primary' }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
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

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month]} ${day}`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Pending', className: styles.statusPending },
      confirmed: { label: 'Pending', className: styles.statusPending },
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

  const calculatePartnerShare = (booking) => {
    if (!booking.totalAmount) return 0;
    return Number(booking.totalAmount) * PARTNER_SHARE;
  };

  const partnerShare = calculatePartnerShare(booking);

  return (
    <div className={styles.card}>
      {/* COMPACT HEADER - Always Visible */}
      <div 
        className={styles.cardHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.headerLeft}>
          <div className={styles.customerName}>{booking.fullName}</div>
          <div className={styles.bookingRef}>
            <code className={styles.refCode}>{booking.bookingReference}</code>
          </div>
        </div>

        <div className={styles.headerRight}>
          {getStatusBadge(booking.status)}
          <button 
            className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            ▼
          </button>
        </div>
      </div>

      {/* QUICK INFO - Always Visible */}
      <div className={styles.quickInfo}>
        <div className={styles.quickInfoItem}>
          <span className={styles.quickIcon}>🧳</span>
          <span className={styles.quickValue}>{booking.luggageCount}</span>
        </div>
        <div className={styles.quickInfoDivider}></div>
        <div className={styles.quickInfoItem}>
          <span className={styles.quickIcon}>📅</span>
          <span className={styles.quickValue}>{formatDateShort(booking.dropOffDate)}</span>
        </div>
        {partnerShare > 0 && (
          <>
            <div className={styles.quickInfoDivider}></div>
            <div className={styles.quickInfoItem}>
              <span className={styles.quickIcon}>💰</span>
              <span className={styles.quickValue}>A${partnerShare.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* EXPANDED DETAILS - Collapsible */}
      <div className={`${styles.expandedContent} ${isExpanded ? styles.show : ''}`}>
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
              onClick={(e) => {
                e.stopPropagation();
                onAction(booking);
              }}
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}