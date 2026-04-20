// components/partner-app/BookingCard/BookingCard.js
'use client';
import { useState } from 'react';
import styles from './BookingCard.module.css';

// Partner flat rates: A$2/small bag/day, A$4/large bag/day
const SMALL_BAG_PARTNER_RATE = 2;
const LARGE_BAG_PARTNER_RATE = 4;

export default function BookingCard({ booking, onAction, actionLabel, actionVariant = 'primary' }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const h = d.getUTCHours();
    return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2,'0')} ${h >= 12 ? 'pm' : 'am'}`;
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
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
    const dropOff = new Date(booking.dropOffDate);
    const pickUp = new Date(booking.pickUpDate);
    const days = Math.max(1, Math.ceil((pickUp - dropOff) / (1000 * 60 * 60 * 24)));
    const smallCount = booking.smallBagCount || 0;
    const largeCount = booking.largeBagCount || 0;
    if (smallCount > 0 || largeCount > 0) {
      return (smallCount * days * SMALL_BAG_PARTNER_RATE) + (largeCount * days * LARGE_BAG_PARTNER_RATE);
    }
    // Legacy bookings with only luggageCount — treat as small bags
    return (booking.luggageCount || 0) * days * SMALL_BAG_PARTNER_RATE;
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
              <span className={styles.label}>💰 Your Earnings:</span>
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