// app/partner/application/scan/page.js
// ✅ WITH ON-SCREEN TOAST NOTIFICATIONS (NO ALERTS!)

'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import styles from './Scan.module.css';

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Multi-photo state
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // ✅ TOAST NOTIFICATION STATE
  const [toast, setToast] = useState(null);
  
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // ✅ TOAST HELPER FUNCTION
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); // Auto-hide after 4 seconds
  };

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            console.log('✅ QR Code scanned:', decodedText);
            setResult(decodedText);
            setScanning(false);
            
            try {
              await html5QrCode.stop();
            } catch {
              console.log('Stop cleanup');
            }
            
            await fetchBookingDetails(decodedText);
          },
          () => {}
        );

        setScanning(true);
        console.log('✅ Scanner started with rear camera');
      } catch (err) {
        console.error('❌ Camera error:', err);
        setError('Unable to access camera. Please allow camera permissions.');
      }
    };

    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
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
          // Load existing photos if any
          if (booking.luggagePhotos && Array.isArray(booking.luggagePhotos)) {
            setCapturedPhotos(booking.luggagePhotos.map(url => ({ dataUrl: url, uploaded: true })));
          }
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
    if (capturedPhotos.length >= 3) {
      showToast('Maximum 3 photos allowed', 'warning');
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image too large. Please choose an image under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedPhotos(prev => [...prev, {
        dataUrl: reader.result,
        file: file,
        uploaded: false
      }]);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadPhoto = async (photoIndex) => {
    const photo = capturedPhotos[photoIndex];
    if (!photo?.file || !result || photo.uploaded) return;

    setUploadingPhoto(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('bookingReference', result);
      formData.append('image', photo.file);

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

      // Mark photo as uploaded
      setCapturedPhotos(prev => prev.map((p, i) => 
        i === photoIndex ? { ...p, uploaded: true } : p
      ));

      showToast('Photo uploaded successfully!', 'success');
      await fetchBookingDetails(result);
      
    } catch (err) {
      console.error('Upload error:', err);
      showToast(err.message, 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (photoIndex) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== photoIndex));
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

      showToast(`Drop-off confirmed for ${result}`, 'success');
      
      // Redirect after showing toast
      setTimeout(() => {
        window.location.href = '/partner/application/dashboard';
      }, 1500);
    } catch (err) {
      console.error('Confirm drop-off error:', err);
      setError(err.message);
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

      showToast(`Pick-up confirmed for ${result}`, 'success');
      
      // Redirect after showing toast
      setTimeout(() => {
        window.location.href = '/partner/application/dashboard';
      }, 1500);
    } catch (err) {
      console.error('Confirm pick-up error:', err);
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setBookingData(null);
    setError('');
    setCapturedPhotos([]);
    window.location.reload();
  };

  return (
    <div className={styles.container}>
      {/* ✅ TOAST NOTIFICATION */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
          <span className={styles.toastIcon}>
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'warning' && '⚠'}
          </span>
          <span className={styles.toastMessage}>{toast.message}</span>
        </div>
      )}

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
          
          <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>

          {scanning && (
            <p className={styles.status}>📡 Scanning...</p>
          )}

          {error && (
            <p className={styles.errorText}>{error}</p>
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

          {/* MULTI-PHOTO SECTION */}
          {bookingData && (
            <div className={styles.photoSection}>
              {bookingData.status === 'stored' ? (
                <div className={styles.photoGallery}>
                  <h4 className={styles.photoTitle}>📸 Luggage Photos ({capturedPhotos.length})</h4>
                  <div className={styles.photoGrid}>
                    {capturedPhotos.map((photo, index) => (
                      <div key={index} className={styles.photoGridItem}>
                        <img 
                          src={photo.dataUrl} 
                          alt={`Luggage ${index + 1}`} 
                          className={styles.luggagePhoto}
                        />
                      </div>
                    ))}
                  </div>
                  <p className={styles.photoHint}>Photos taken during drop-off</p>
                </div>
              ) : (bookingData.status === 'confirmed' || bookingData.status === 'pending') ? (
                <div className={styles.photoCapture}>
                  <h4 className={styles.photoTitle}>
                    📸 Luggage Photos ({capturedPhotos.length}/3)
                  </h4>

                  {capturedPhotos.length > 0 && (
                    <div className={styles.photoGrid}>
                      {capturedPhotos.map((photo, index) => (
                        <div key={index} className={styles.photoGridItem}>
                          <img 
                            src={photo.dataUrl} 
                            alt={`Luggage ${index + 1}`} 
                            className={styles.capturedImage}
                          />
                          <div className={styles.photoActions}>
                            {!photo.uploaded ? (
                              <>
                                <button 
                                  className={styles.uploadButton}
                                  onClick={() => uploadPhoto(index)}
                                  disabled={uploadingPhoto}
                                >
                                  {uploadingPhoto ? '⏳' : '✓'}
                                </button>
                                <button 
                                  className={styles.removeButton}
                                  onClick={() => removePhoto(index)}
                                  disabled={uploadingPhoto}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <div className={styles.uploadedBadge}>✓ Uploaded</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {capturedPhotos.length < 3 && (
                    <button 
                      className={styles.photoButton}
                      onClick={handleTakePhoto}
                    >
                      📷 Add Photo ({capturedPhotos.length}/3)
                    </button>
                  )}

                  {capturedPhotos.length === 3 && (
                    <p className={styles.photoMaxNote}>Maximum 3 photos reached ✓</p>
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