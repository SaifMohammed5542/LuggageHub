// app/booking-form/page.js
'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import LuggageBookingForm from "@/components/booking-form/LuggageBookingForm";

function BookingFormContent() {
  const searchParams = useSearchParams();
  const stationSlug = searchParams?.get('station');
  
  const [resolvedStation, setResolvedStation] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState(null);

  // ✅ OPTIMIZED: Direct slug resolution - no full list fetch
  useEffect(() => {
    if (!stationSlug) {
      setResolvedStation(null);
      setIsResolving(false);
      return;
    }

    const resolveStation = async () => {
      setIsResolving(true);
      setError(null);
      
      try {
        // ✅ NEW: Direct API call - only fetches ONE station
        const response = await fetch(`/api/station/by-slug/${stationSlug}`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          setError(data.message || `Station "${stationSlug}" not found`);
          setResolvedStation(null);
        } else {
          setResolvedStation(data.station);
        }
      } catch (err) {
        console.error('Error resolving station:', err);
        setError('Unable to load station information');
        setResolvedStation(null);
      } finally {
        setIsResolving(false);
      }
    };

    resolveStation();
  }, [stationSlug]);

  // ✅ Loading state (should be < 500ms now)
  if (isResolving) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading station...</p>
      </div>
    );
  }

  // ✅ Error state - station not found
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2 style={styles.errorTitle}>Station Not Found</h2>
        <p style={styles.errorMessage}>{error}</p>
        <a href="/booking-form" style={styles.errorButton}>
          Browse All Stations
        </a>
      </div>
    );
  }

  return (
    <LuggageBookingForm 
      prefilledStation={resolvedStation}
      isStationLocked={!!stationSlug}
    />
  );
}

// ✅ Inline styles for faster initial render
const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    flexDirection: 'column',
    gap: '16px',
    background: 'var(--background, #fff)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1a73e8',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    background: 'var(--background, #fff)'
  },
  errorIcon: {
    fontSize: '64px'
  },
  errorTitle: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#333'
  },
  errorMessage: {
    color: '#666',
    textAlign: 'center',
    margin: '0 0 24px 0',
    fontSize: '16px'
  },
  errorButton: {
    padding: '12px 24px',
    background: '#1a73e8',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'background 0.2s',
    cursor: 'pointer'
  }
};

// Add spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default function BookingFormPage() {
  return (
    <Suspense fallback={
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading...</p>
      </div>
    }>
      <BookingFormContent />
    </Suspense>
  );
}