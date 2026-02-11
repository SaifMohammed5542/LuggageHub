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
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let scanner = null;

    const startScanner = () => {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: false,
          showZoomSliderIfSupported: false,
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          setResult(decodedText);
          setScanning(false);
          scanner.clear();
          
          // Fetch booking details
          await fetchBookingDetails(decodedText);
        },
        (errorMessage) => {
          console.log('Scan error:', errorMessage);
        }
      );

      setScanning(true);
    };

    startScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
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

  const startPhotoCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Rear camera
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoDataUrl);
      
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setShowCamera(false);
    }
  };

  const uploadPhoto = async () => {
    if (!capturedPhoto || !result) return;

    setUploadingPhoto(true);
    setError('');

    try {
      // Convert base64 to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('bookingReference', result);
      formData.append('image', blob, 'luggage.jpg');

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
      
      // Refresh booking data to show new photo
      await fetchBookingDetails(result);
      setCapturedPhoto(null);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const cancelPhoto = () => {
    setCapturedPhoto(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
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

      {!result ? (
        <div className={styles.scannerSection}>
          <p className={styles.instruction}>
            Position the QR code within the frame
          </p>
          
        {/* ✅ SCANNER CONTAINER - NO UI CONTROLS */} 
        {!result && scanning && ( <p className={styles.status}>📡 Scanning...</p> )} 
        <div id="qr-reader" className={styles.qrReader}></div>
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

          {/* Booking Details */}
          {bookingData && (
            <div className={styles.bookingDetails}>
              <h3 className={styles.detailsTitle}>Booking Details</h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Customer:</span>
                <span className={styles.detailValue}>{bookingData.fullName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Bags:</span>
                <span className={styles.detailValue}>{bookingData.luggageCount}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status:</span>
                <span className={styles.detailValue}>{bookingData.status}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Reference:</span>
                <span className={styles.detailValue}>{result}</span>
              </div>
            </div>
          )}

          {/* Photo Section */}
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
                  {!showCamera && !capturedPhoto && (
                    <button 
                      className={styles.photoButton}
                      onClick={startPhotoCapture}
                    >
                      📷 Take Luggage Photo
                    </button>
                  )}

                  {showCamera && (
                    <div className={styles.cameraView}>
                      <video 
                        ref={videoRef}
                        autoPlay 
                        playsInline
                        className={styles.videoPreview}
                      />
                      <div className={styles.cameraControls}>
                        <button 
                          className={styles.captureButton}
                          onClick={capturePhoto}
                        >
                          📸 Capture
                        </button>
                        <button 
                          className={styles.cancelButton}
                          onClick={cancelPhoto}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {capturedPhoto && (
                    <div className={styles.photoPreview}>
                      <img 
                        src={capturedPhoto} 
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
                          onClick={() => setCapturedPhoto(null)}
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

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

          {error && (
            <div className={styles.errorBanner}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorText}>{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            {bookingData && bookingData.status !== 'stored' && (
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