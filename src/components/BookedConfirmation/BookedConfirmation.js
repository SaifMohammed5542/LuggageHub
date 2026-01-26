// components/BookedConfirmation/BookedConfirmation.js
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import styles from './BookedConfirmation.module.css';
import Header from '../Header';

const BookedConfirmationPage = () => {
  const [bookingData, setBookingData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const confirmationRef = useRef(null);

  useEffect(() => {
    try {
      const storedBooking = sessionStorage.getItem('lastBooking');
      
      if (storedBooking) {
        const parsedData = JSON.parse(storedBooking);
        console.log('✅ Loaded booking data from sessionStorage:', parsedData);
        setBookingData(parsedData);
      } else {
        console.warn('⚠️ No booking data found in sessionStorage');
        setError('No booking information found. Please check your email for confirmation details.');
      }
    } catch (err) {
      console.error('❌ Error loading booking data:', err);
      setError('Failed to load booking information. Please check your email for confirmation details.');
    }
  }, []);

  // ✅ OPTIMIZATION: Lazy load html2canvas only when needed
  const handleDownloadScreenshot = useCallback(async () => {
    if (!confirmationRef.current) return;
    
    setIsDownloading(true);
    try {
      // ✅ Dynamic import - loads only when user clicks download
      const { default: html2canvas } = await import('html2canvas');
      
      const canvas = await html2canvas(confirmationRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const link = document.createElement('a');
      link.download = `luggage-booking-${bookingData?.bookingReference || 'confirmation'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('Failed to download screenshot. Please try taking a screenshot manually or print this page.');
    } finally {
      setIsDownloading(false);
    }
  }, [bookingData?.bookingReference]); // ✅ Memoized with dependency

  // ✅ OPTIMIZATION: Memoize date formatting function
// ✅ OPTIMIZATION: Memoize date formatting function
const formatDateTime = useCallback((dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Invalid date';
  }
}, []);

  // ✅ OPTIMIZATION: Memoize navigation handlers
  const handlePrint = useCallback(() => window.print(), []);
  const handleGoHome = useCallback(() => window.location.href = '/', []);

  // Loading state
  if (!bookingData && !error) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading your booking details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <>
      <Header />
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2 className={styles.errorTitle}>Booking Information Unavailable</h2>
        <p className={styles.errorText}>{error}</p>
        <button 
          onClick={handleGoHome}
          className={`${styles.button} ${styles.primaryButton}`}
        >
          <span className={styles.buttonIcon}>🏠</span>
          Back to Home
        </button>
      </div>
      </>
    );
  }

  return (
    <>
    <Header />
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Main Confirmation Card */}
        <div ref={confirmationRef} className={styles.confirmationCard}>
          {/* Success Header */}
          <div className={styles.successHeader}>
            <div className={styles.checkmarkCircle}>
              <svg width="80" height="80" viewBox="0 0 80 80" className={styles.checkmark}>
                <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.5"/>
                <path d="M25 40 L35 50 L55 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className={styles.mainTitle}>Booking Confirmed!</h1>
            <p className={styles.subtitle}>Your luggage storage has been successfully booked</p>
          </div>

          {/* Booking Reference */}
          <div className={styles.referenceSection}>
            <div className={styles.referenceLabel}>Booking Reference</div>
            <div className={styles.referenceNumber}>{bookingData.bookingReference}</div>
            <div className={styles.instructionBox}>
              <span className={styles.infoIcon}>ℹ️</span>
              <span className={styles.instructionText}>Show this reference at the storage location</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>👤</span>
              Customer Details
            </h2>
            <div className={styles.detailsGrid}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Name</span>
                <span className={styles.detailValue}>{bookingData.fullName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{bookingData.email}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Phone</span>
                <span className={styles.detailValue}>{bookingData.phone}</span>
              </div>
            </div>
          </div>

          {/* Storage Location */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📍</span>
              Storage Location
            </h2>
            <div className={styles.locationCard}>
              <div className={styles.locationName}>{bookingData.stationName}</div>
              {bookingData.stationLocation && (
                <div className={styles.locationAddress}>{bookingData.stationLocation}</div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📅</span>
              Storage Schedule
            </h2>
            <div className={styles.scheduleGrid}>
              <div className={styles.scheduleCard}>
                <div className={styles.scheduleIcon}>📥</div>
                <div className={styles.scheduleLabel}>Drop-off</div>
                <div className={styles.scheduleTime}>{formatDateTime(bookingData.dropOffDate)}</div>
              </div>
              <div className={styles.scheduleCard}>
                <div className={styles.scheduleIcon}>📤</div>
                <div className={styles.scheduleLabel}>Pick-up</div>
                <div className={styles.scheduleTime}>{formatDateTime(bookingData.pickUpDate)}</div>
              </div>
            </div>
          </div>

          {/* Luggage Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🧳</span>
              Luggage Details
            </h2>
            <div className={styles.luggageGrid}>
              {bookingData.smallBagCount > 0 && (
                <div className={styles.luggageCard}>
                  <div className={styles.luggageIcon}>🎒</div>
                  <div className={styles.luggageCount}>{bookingData.smallBagCount}</div>
                  <div className={styles.luggageLabel}>Small Bags</div>
                </div>
              )}
              {bookingData.largeBagCount > 0 && (
                <div className={styles.luggageCard}>
                  <div className={styles.luggageIcon}>🧳</div>
                  <div className={styles.luggageCount}>{bookingData.largeBagCount}</div>
                  <div className={styles.luggageLabel}>Large Bags</div>
                </div>
              )}
              <div className={`${styles.luggageCard} ${styles.totalCard}`}>
                <div className={styles.luggageIcon}>📦</div>
                <div className={styles.luggageCount}>{bookingData.totalBags}</div>
                <div className={styles.luggageLabel}>Total Bags</div>
              </div>
            </div>
            {bookingData.specialInstructions && (
              <div className={styles.instructionsBox}>
                <div className={styles.instructionsLabel}>Special Instructions:</div>
                <div className={styles.instructionsText}>{bookingData.specialInstructions}</div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>💳</span>
              Payment Details
            </h2>
            <div className={styles.paymentCard}>
              <div className={styles.paymentRow}>
                <span className={styles.paymentLabel}>Payment Reference</span>
                <span className={styles.paymentValue}>{bookingData.paymentReference}</span>
              </div>
              {bookingData.paypalTransactionId && (
                <div className={styles.paymentRow}>
                  <span className={styles.paymentLabel}>Transaction ID</span>
                  <span className={styles.paymentValue}>{bookingData.paypalTransactionId}</span>
                </div>
              )}
              <div className={styles.paymentDivider}></div>
              <div className={styles.paymentRow}>
                <span className={styles.totalLabel}>Total Paid</span>
                <span className={styles.totalAmount}>
                  A${Number(bookingData.totalAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className={styles.paymentStatus}>
                <span className={styles.statusIcon}>✓</span>
                <span className={styles.statusText}>Payment Confirmed</span>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className={styles.noticeBox}>
            <div className={styles.noticeIcon}>📌</div>
            <div className={styles.noticeContent}>
              <div className={styles.noticeTitle}>Important Reminders</div>
              <ul className={styles.noticeList}>
                <li>Bring a valid ID and this booking reference when dropping off and picking up</li>
                <li>A confirmation email has been sent to {bookingData.email}</li>
                <li>Your luggage is covered up to A$2000</li>
                <li>Contact us if you need to modify your booking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionsContainer}>
          <button 
            onClick={handleDownloadScreenshot}
            disabled={isDownloading}
            className={`${styles.button} ${styles.primaryButton}`}
          >
            {isDownloading ? (
              <>
                <span className={styles.buttonSpinner}></span>
                Downloading...
              </>
            ) : (
              <>
                <span className={styles.buttonIcon}>📸</span>
                Save as Image
              </>
            )}
          </button>
          
          <button 
            onClick={handlePrint}
            className={`${styles.button} ${styles.secondaryButton}`}
          >
            <span className={styles.buttonIcon}>🖨️</span>
            Print
          </button>
          
          <button 
            onClick={handleGoHome}
            className={`${styles.button} ${styles.secondaryButton}`}
          >
            <span className={styles.buttonIcon}>🏠</span>
            Back to Home
          </button>
        </div>

        {/* Footer Info */}
        <div className={styles.footerInfo}>
          <p className={styles.footerText}>
            Need help? Contact us at <a href="mailto:support@luggageterminal.com" className={styles.footerLink}>support@luggageterminal.com</a>
          </p>
          <p className={styles.footerText}>
            Booked on {formatDateTime(bookingData.bookingDate)}
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default memo(BookedConfirmationPage);