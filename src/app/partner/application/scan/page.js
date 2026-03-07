// app/partner/application/scan/page.js
// ✅ SIMPLIFIED UX - Batch photo upload on confirm

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
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Photo state - simpler
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For full-size view
  
  // Toast state
  const [toast, setToast] = useState(null);
  
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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
      setLoadingDetails(true);
      const userId = localStorage.getItem('userId');
      
      const response = await fetch(`/api/partner/${userId}/bookings`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const booking = data.bookings?.find(b => b.bookingReference === bookingRef);
        if (booking) {
          setBookingData(booking);
          
          // Load existing photos
          const photos = [];
          if (booking.luggagePhotos && Array.isArray(booking.luggagePhotos) && booking.luggagePhotos.length > 0) {
            photos.push(...booking.luggagePhotos.map(url => ({ dataUrl: url, uploaded: true })));
          } else if (booking.luggagePhotoUrl) {
            photos.push({ dataUrl: booking.luggagePhotoUrl, uploaded: true });
          }
          setCapturedPhotos(photos);
        } else {
          setError('Booking not found in your station');
        }
      }
    } catch (err) {
      console.error('Failed to fetch booking:', err);
      setError('Failed to load booking details');
    } finally {
      setLoadingDetails(false);
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
      showToast('Image too large. Max 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedPhotos(prev => [...prev, {
        dataUrl: reader.result,
        file: file,
        uploaded: false
      }]);
      showToast('Photo added', 'success');
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (photoIndex) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== photoIndex));
    showToast('Photo removed', 'success');
  };

  // ✅ BATCH UPLOAD ALL PHOTOS AT ONCE
  const uploadAllPhotos = async () => {
    const photosToUpload = capturedPhotos.filter(p => !p.uploaded && p.file);
    
    if (photosToUpload.length === 0) return true; // No new photos to upload

    try {
      for (let i = 0; i < photosToUpload.length; i++) {
        const photo = photosToUpload[i];
        const formData = new FormData();
        formData.append('bookingReference', result);
        formData.append('image', photo.file);

        const uploadResponse = await fetch('/api/partner/application/upload-luggage-photo', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const data = await uploadResponse.json();
          throw new Error(data.error || 'Failed to upload photo');
        }
      }
      
      return true;
    } catch (err) {
      throw new Error(`Photo upload failed: ${err.message}`);
    }
  };

  const handleConfirmDropoff = async () => {
    if (!result || processing) return;

    setProcessing(true);
    setError('');

    try {
      // ✅ Upload all photos first
      await uploadAllPhotos();

      // ✅ Then confirm drop-off
      const response = await fetch('/api/partner/application/confirm-dropoff', {
        method: 'POST',
        credentials: 'include',
        headers: {
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

      showToast('Drop-off confirmed!', 'success');
      
      setTimeout(() => {
        window.location.href = '/partner/application/dashboard';
      }, 1000);
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
      const response = await fetch('/api/partner/application/confirm-pickup', {
        method: 'POST',
        credentials: 'include',
        headers: {
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

      showToast('Pick-up confirmed!', 'success');
      
      setTimeout(() => {
        window.location.href = '/partner/application/dashboard';
      }, 1000);
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
    setSelectedPhoto(null);
    window.location.reload();
  };

  return (
    <div className={styles.container}>
      {/* Toast */}
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

      {/* Full-size photo modal */}
      {selectedPhoto && (
        <div className={styles.photoModal} onClick={() => setSelectedPhoto(null)}>
          <div className={styles.photoModalContent}>
            <button className={styles.photoModalClose} onClick={() => setSelectedPhoto(null)}>✕</button>
            <img src={selectedPhoto} alt="Full size" className={styles.photoModalImage} />
          </div>
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
          {/* Loading indicator while fetching details */}
          {loadingDetails ? (
            <div className={styles.loadingDetails}>
              <div className={styles.spinner}></div>
              <p>Loading booking details...</p>
            </div>
          ) : (
            <>
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

              {/* Photo Section */}
              {bookingData && (
                <div className={styles.photoSection}>
                  {bookingData.status === 'stored' ? (
                    <div className={styles.photoGallery}>
                      <h4 className={styles.photoTitle}>📸 Luggage Photos ({capturedPhotos.length})</h4>
                      <div className={styles.photoGrid}>
                        {capturedPhotos.map((photo, index) => (
                          <div 
                            key={index} 
                            className={styles.photoGridItem}
                            onClick={() => setSelectedPhoto(photo.dataUrl)}
                          >
                            <img 
                              src={photo.dataUrl} 
                              alt={`Luggage ${index + 1}`} 
                              className={styles.luggagePhoto}
                            />
                            <div className={styles.photoZoomHint}>🔍 Tap to enlarge</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (bookingData.status === 'confirmed' || bookingData.status === 'pending') ? (
                    <div className={styles.photoCapture}>
                      <h4 className={styles.photoTitle}>
                        📸 Luggage Photos ({capturedPhotos.filter(p => !p.uploaded).length}/3)
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
                              {!photo.uploaded && (
                                <button 
                                  className={styles.removePhotoButton}
                                  onClick={() => removePhoto(index)}
                                  disabled={processing}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {capturedPhotos.filter(p => !p.uploaded).length < 3 && (
                        <button 
                          className={styles.photoButton}
                          onClick={handleTakePhoto}
                          disabled={processing}
                        >
                          📷 Add Photo ({capturedPhotos.filter(p => !p.uploaded).length}/3)
                        </button>
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
                    {processing ? (
                      <>
                        <span className={styles.buttonSpinner}></span>
                        Uploading photos & confirming...
                      </>
                    ) : (
                      '📥 Confirm Drop-off'
                    )}
                  </button>
                )}

                {bookingData && bookingData.status === 'stored' && (
                  <button
                    className={styles.pickupButton}
                    onClick={handleConfirmPickup}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <span className={styles.buttonSpinner}></span>
                        Confirming...
                      </>
                    ) : (
                      '📤 Confirm Pick-up'
                    )}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}