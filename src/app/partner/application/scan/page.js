// app/partner/application/scan/page.js
// ✅ OPTION B: Parallel uploads + compression + error recovery

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
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0, failed: [] });
  
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [toast, setToast] = useState(null);
  
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ✅ COMPRESS IMAGE - Reduces size by 60-80%
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize to max 1200px (good quality, smaller size)
          const maxDimension = 1200;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality (good balance)
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            console.log(`Compressed: ${(file.size/1024).toFixed(0)}KB → ${(compressedFile.size/1024).toFixed(0)}KB`);
            resolve(compressedFile);
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            setResult(decodedText);
            setScanning(false);
            try { await html5QrCode.stop(); } catch {}
            await fetchBookingDetails(decodedText);
          },
          () => {}
        );
        setScanning(true);
      } catch {
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
      setCapturedPhotos([]); // Clear previous photos
      setError('');
      
      const response = await fetch(`/api/partner/application/verify-qr?bookingReference=${bookingRef}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.booking) {
        setBookingData(data.booking);
        
        // Load existing photos
        const photos = [];
        if (data.booking.luggagePhotos && Array.isArray(data.booking.luggagePhotos) && data.booking.luggagePhotos.length > 0) {
          photos.push(...data.booking.luggagePhotos.map(url => ({ dataUrl: url, uploaded: true })));
        } else if (data.booking.luggagePhotoUrl) {
          photos.push({ dataUrl: data.booking.luggagePhotoUrl, uploaded: true });
        }
        setCapturedPhotos(photos);
      } else {
        setError(data.error || 'Booking not found in your station');
      }
    } catch (err) {
      console.error('Failed to fetch booking:', err);
      setError('Failed to load booking details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleTakePhoto = () => {
    if (capturedPhotos.length >= 9) {
      showToast('Maximum 9 photos allowed', 'warning');
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image too large. Max 10MB', 'error');
      return;
    }

    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPhotos(prev => [...prev, {
          dataUrl: reader.result,
          file: file,
          uploaded: false,
          compressing: true
        }]);
      };
      reader.readAsDataURL(file);
      
      // Compress in background
      const compressedFile = await compressImage(file);
      
      // Update with compressed version
      setCapturedPhotos(prev => {
        const newPhotos = [...prev];
        const lastIndex = newPhotos.length - 1;
        if (newPhotos[lastIndex]?.compressing) {
          newPhotos[lastIndex] = {
            dataUrl: newPhotos[lastIndex].dataUrl,
            file: compressedFile,
            uploaded: false
          };
        }
        return newPhotos;
      });
      
      showToast('Photo added & compressed', 'success');
    } catch (err) {
      console.error('Compression error:', err);
      showToast('Failed to process image', 'error');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (photoIndex) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== photoIndex));
    showToast('Photo removed', 'success');
  };

  // ✅ PARALLEL UPLOAD - All photos upload at once!
  const uploadAllPhotos = async () => {
    const photosToUpload = capturedPhotos.filter(p => !p.uploaded && p.file && !p.compressing);
    
    if (photosToUpload.length === 0) return { success: true, uploaded: 0 };

    setUploadProgress({ completed: 0, total: photosToUpload.length, failed: [] });

    // Create upload promises for ALL photos
    const uploadPromises = photosToUpload.map(async (photo, index) => {
      try {
        const formData = new FormData();
        formData.append('bookingReference', result);
        formData.append('image', photo.file);

        console.log(`Starting upload ${index + 1}/${photosToUpload.length}`);

        const uploadResponse = await fetch('/api/partner/application/upload-luggage-photo', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        const data = await uploadResponse.json();
        
        if (!uploadResponse.ok) {
          throw new Error(data.error || `Photo ${index + 1} failed`);
        }
        
        // Update progress
        setUploadProgress(prev => ({
          ...prev,
          completed: prev.completed + 1
        }));
        
        console.log(`✅ Photo ${index + 1} uploaded`);
        return { success: true, index };
        
      } catch (err) {
        console.error(`❌ Photo ${index + 1} failed:`, err);
        setUploadProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
          failed: [...prev.failed, index + 1]
        }));
        return { success: false, index, error: err.message };
      }
    });

    // ✅ Wait for ALL uploads to complete (parallel)
    const results = await Promise.all(uploadPromises);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    return { 
      success: failedCount === 0, 
      uploaded: successCount,
      failed: failedCount,
      failedIndexes: results.filter(r => !r.success).map(r => r.index + 1)
    };
  };

  const handleConfirmDropoff = async () => {
    if (!result || processing) return;

    setProcessing(true);
    setError('');

    try {
      // ✅ Upload all photos in parallel
      const uploadResult = await uploadAllPhotos();

      if (!uploadResult.success) {
        throw new Error(
          `${uploadResult.failed} photo(s) failed to upload (Photo #${uploadResult.failedIndexes.join(', #')}). Please retry.`
        );
      }

      // ✅ Confirm drop-off
      const response = await fetch('/api/partner/application/confirm-dropoff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingReference: result }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm drop-off');
      }

      showToast(`✅ Drop-off confirmed! ${uploadResult.uploaded} photos uploaded`, 'success');
      
      setTimeout(() => {
        window.location.href = '/partner/application/dashboard';
      }, 1500);
      
    } catch (err) {
      console.error('Confirm drop-off error:', err);
      setError(err.message);
      setProcessing(false);
      setUploadProgress({ completed: 0, total: 0, failed: [] });
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingReference: result }),
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
    if (processing) {
      const confirm = window.confirm('Upload in progress. Cancel and scan new booking?');
      if (!confirm) return;
    }
    window.location.reload();
  };

  return (
    <div className={styles.container}>
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
          <p className={styles.instruction}>Position the QR code within the frame</p>
          <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
          {scanning && <p className={styles.status}>📡 Scanning...</p>}
          {error && <p className={styles.errorText}>{error}</p>}
          <p className={styles.hint}>💡 Make sure the QR code is well-lit and in focus</p>
        </div>
      ) : (
        <div className={styles.resultSection}>
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
                    <span className={styles.detailLabel}>Booking Ref:</span>
                    <span className={styles.detailValue}>{bookingData.bookingReference}</span>
                  </div>
                  
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Customer:</span>
                    <span className={styles.detailValue}>{bookingData.fullName}</span>
                  </div>
                  
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Phone:</span>
                    <span className={styles.detailValue}>{bookingData.phone || 'N/A'}</span>
                  </div>
                  
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Email:</span>
                    <span className={styles.detailValue} style={{ fontSize: '13px' }}>{bookingData.email}</span>
                  </div>
                  
                  <div className={styles.detailDivider}></div>
                  
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Drop-off Date:</span>
                    <span className={styles.detailValue}>
                      {new Date(bookingData.dropOffDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Drop-off Time:</span>
                    <span className={styles.detailValue}>
                      {new Date(bookingData.dropOffDate).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Pick-up Date:</span>
                    <span className={styles.detailValue}>
                      {new Date(bookingData.pickUpDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Pick-up Time:</span>
                    <span className={styles.detailValue}>
                      {new Date(bookingData.pickUpDate).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  
                  <div className={styles.detailDivider}></div>
                  
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
                    <span className={styles.detailValue} style={{ fontWeight: '900', color: '#0284C7' }}>
                      {bookingData.luggageCount}
                    </span>
                  </div>
                  
                  {bookingData.specialInstructions && (
                    <>
                      <div className={styles.detailDivider}></div>
                      <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className={styles.detailLabel}>Special Instructions:</span>
                        <span className={styles.detailValue} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                          {bookingData.specialInstructions}
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div className={styles.detailDivider}></div>
                  
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status:</span>
                    <span className={`${styles.detailValue} ${styles.statusBadge} ${styles[`status${bookingData.status.charAt(0).toUpperCase() + bookingData.status.slice(1)}`]}`}>
                      {bookingData.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {bookingData.checkInTime && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Checked In:</span>
                      <span className={styles.detailValue}>
                        {new Date(bookingData.checkInTime).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {bookingData && (
                <div className={styles.photoSection}>
                  {bookingData.status === 'stored' ? (
                    <div className={styles.photoGallery}>
                      <h4 className={styles.photoTitle}>📸 Luggage Photos ({capturedPhotos.length})</h4>
                      <div className={styles.photoGrid}>
                        {capturedPhotos.map((photo, index) => (
                          <div key={index} className={styles.photoGridItem} onClick={() => setSelectedPhoto(photo.dataUrl)}>
                            <img src={photo.dataUrl} alt={`Luggage ${index + 1}`} className={styles.luggagePhoto} />
                            <div className={styles.photoZoomHint}>🔍 Tap to enlarge</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (bookingData.status === 'confirmed' || bookingData.status === 'pending') ? (
                    <div className={styles.photoCapture}>
                      <h4 className={styles.photoTitle}>
                        📸 Luggage Photos ({capturedPhotos.filter(p => !p.uploaded).length}/9)
                      </h4>

                      {capturedPhotos.length > 0 && (
                        <div className={styles.photoGrid}>
                          {capturedPhotos.map((photo, index) => (
                            <div key={index} className={styles.photoGridItem}>
                              <img src={photo.dataUrl} alt={`Luggage ${index + 1}`} className={styles.capturedImage} />
                              {!photo.uploaded && !photo.compressing && (
                                <button 
                                  className={styles.removePhotoButton}
                                  onClick={() => removePhoto(index)}
                                  disabled={processing}
                                >
                                  ✕
                                </button>
                              )}
                              {photo.compressing && (
                                <div className={styles.compressingBadge}>Compressing...</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {capturedPhotos.filter(p => !p.uploaded).length < 9 && (
                        <button 
                          className={styles.photoButton}
                          onClick={handleTakePhoto}
                          disabled={processing}
                        >
                          📷 Add Photo ({capturedPhotos.filter(p => !p.uploaded).length}/9)
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

              {/* ✅ Parallel Upload Progress */}
              {processing && uploadProgress.total > 0 && (
                <div className={styles.uploadProgress}>
                  <div className={styles.progressBarContainer}>
                    <div 
                      className={styles.progressBar} 
                      style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className={styles.progressText}>
                    {uploadProgress.completed < uploadProgress.total 
                      ? `Uploading ${uploadProgress.total} photos in parallel... ${uploadProgress.completed}/${uploadProgress.total} done`
                      : `All photos uploaded! Confirming drop-off...`
                    }
                  </p>
                  {uploadProgress.failed.length > 0 && (
                    <p className={styles.progressError}>
                      Failed: Photo #{uploadProgress.failed.join(', #')}
                    </p>
                  )}
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
                        Processing...
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