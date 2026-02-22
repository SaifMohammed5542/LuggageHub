// app/partner/application/scan/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './Scan.module.css';

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    const startScanner = () => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          // ✅ FORCE REAR CAMERA
          videoConstraints: {
            facingMode: { exact: "environment" } // Forces rear camera
          },
          // ✅ DISABLE ALL UI CONTROLS
          showTorchButtonIfSupported: false,
          rememberLastUsedCamera: false,
          showZoomSliderIfSupported: false,
          disableFlip: true,
        },
        false // verbose = false
      );

      scannerRef.current = scanner;

      scanner.render(
        async (decodedText) => {
          console.log('✅ QR Code scanned:', decodedText);
          setResult(decodedText);
          setScanning(false);
          
          // Stop scanner
          try {
            await scanner.clear();
          } catch (e) {
            console.log('Scanner cleanup');
          }
          
          // Fetch booking details
          await fetchBookingDetails(decodedText);
        },
        (errorMessage) => {
          // Ignore continuous scan errors
        }
      );

      setScanning(true);
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.log('Cleanup');
        }
      }
    };
  }, []);

  const fetchBookingDetails = async (bookingRef) => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      const response = await fetch(`/api/partner/${userId}/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const booking = data.bookings?.find(b => b.bookingReference === bookingRef);
        if (booking) {
          setBookingData(booking);
        } else {
          setError('Booking not found in your station');
        }
      }
    } catch (err) {
      console.error('Failed to fetch booking:', err);
      setError('Failed to load booking details');
    }
  };

  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Please choose an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedPhoto({
        dataUrl: e.target.result,
        file: file
      });
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async () => {
    if (!capturedPhoto?.file || !result) return;

    setUploadingPhoto(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('bookingReference', result);
      formData.append('image', capturedPhoto.file);

      const token = localStorage.getItem('token');
      const uploadResponse = await fetch('/api/partner/application/upload-luggage-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      alert('✅ Photo uploaded successfully!');
      
      await fetchBookingDetails(result);
      setCapturedPhoto(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const cancelPhoto = () => {
    setCapturedPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmDropoff = async () => {
    if (!result || processing) return;

    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/partner/application/confirm-dropoff', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingReference: result,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm drop-off');
      }

      alert(`✅ Drop-off confirmed for booking: ${result}`);
      router.push('/partner/application/dashboard');
    } catch (err) {
      console.error('Confirm drop-off error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!result || processing) return;

    setProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/partner/application/confirm-pickup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingReference: result,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm pick-up');
      }

      alert(`✅ Pick-up confirmed for booking: ${result}`);
      router.push('/partner/application/dashboard');
    } catch (err) {
      console.error('Confirm pick-up error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setBookingData(null);
    setError('');
    setCapturedPhoto(null);
    window.location.reload();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push('/partner/application/dashboard')}>
          ← Back
        </button>
        <h1 className={styles.title}>📷 Scan QR Code</h1>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelected}
        style={{ display: 'none' }}
      />

      {!result ? (
        <div className={styles.scannerSection}>
          <p className={styles.instruction}>
            Position the QR code within the frame
          </p>
          
          <div id="qr-reader" className={styles.qrReader}></div>

          {scanning && (
            <p className={styles.status}>📡 Scanning...</p>
          )}

          <p className={styles.hint}>
            💡 Make sure the QR code is well-lit and in focus
          </p>
        </div>
      ) : (
        <div className={styles.resultSection}>
          <div className={styles.successBanner}>
            <div className={styles.successIcon}>✅</div>
            <div className={styles.successTitle}>QR Code Scanned!</div>
          </div>

          {bookingData && (
            <div className={styles.bookingDetails}>
              <h3 className={styles.detailsTitle}>Booking Details</h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Customer:</span>
                <span className={styles.detailValue}>{bookingData.fullName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Small Bags:</span>
                <span className={styles.detailValue}>{bookingData.smallBagCount || 0}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Large Bags:</span>
                <span className={styles.detailValue}>{bookingData.largeBagCount || 0}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Total Bags:</span>
                <span className={styles.detailValue}>{bookingData.luggageCount}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status:</span>
                <span className={styles.detailValue}>{bookingData.status}</span>
              </div>
            </div>
          )}

          {bookingData && (
            <div className={styles.photoSection}>
              {bookingData.luggagePhotoUrl ? (
                <div className={styles.existingPhoto}>
                  <h4 className={styles.photoTitle}>📸 Luggage Photo</h4>
                  <img 
                    src={bookingData.luggagePhotoUrl} 
                    alt="Luggage" 
                    className={styles.luggagePhoto}
                  />
                  <p className={styles.photoHint}>Photo taken during drop-off</p>
                </div>
              ) : bookingData.status === 'confirmed' || bookingData.status === 'pending' ? (
                <div className={styles.photoCapture}>
                  {!capturedPhoto ? (
                    <button 
                      className={styles.photoButton}
                      onClick={handleTakePhoto}
                    >
                      📷 Take Luggage Photo
                    </button>
                  ) : (
                    <div className={styles.photoPreview}>
                      <h4 className={styles.photoTitle}>Preview</h4>
                      <img 
                        src={capturedPhoto.dataUrl} 
                        alt="Captured luggage" 
                        className={styles.capturedImage}
                      />
                      <div className={styles.photoActions}>
                        <button 
                          className={styles.uploadButton}
                          onClick={uploadPhoto}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? '⏳ Uploading...' : '✓ Save Photo'}
                        </button>
                        <button 
                          className={styles.retakeButton}
                          onClick={cancelPhoto}
                          disabled={uploadingPhoto}
                        >
                          🔄 Retake
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {error && (
            <div className={styles.errorBanner}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorText}>{error}</div>
            </div>
          )}

          <div className={styles.actionButtons}>
            {bookingData && bookingData.status !== 'stored' && bookingData.status !== 'completed' && (
              <button
                className={styles.dropoffButton}
                onClick={handleConfirmDropoff}
                disabled={processing}
              >
                {processing ? 'Processing...' : '📥 Confirm Drop-off'}
              </button>
            )}

            {bookingData && bookingData.status === 'stored' && (
              <button
                className={styles.pickupButton}
                onClick={handleConfirmPickup}
                disabled={processing}
              >
                {processing ? 'Processing...' : '📤 Confirm Pick-up'}
              </button>
            )}

            <button
              className={styles.scanAgainButton}
              onClick={handleScanAgain}
              disabled={processing}
            >
              🔄 Scan Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}