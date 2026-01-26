"use client";
import React, { useState, useMemo, useCallback, memo } from 'react';
import { MapPin, Clock, TrendingUp, DollarSign, Star, X, Map, Award } from 'lucide-react';
import styles from './StationPreviewCard.module.css';

const StationPreviewCard = memo(({ 
  station, 
  onBook, 
  onClose, 
  onViewOnMap, 
  mode = 'drawer',
  currentCapacity = null
}) => {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ✅ OPTIMIZATION: Memoize capacity calculation
  const capacityStatus = useMemo(() => {
    if (!currentCapacity || !station.capacity) {
      return { color: '#10b981', label: 'Available', icon: '🟢', percentage: 0 };
    }

    const percentage = (currentCapacity / station.capacity) * 100;
    
    if (percentage >= 90) {
      return { color: '#ef4444', label: 'Almost Full', icon: '🔴', percentage: Math.round(percentage) };
    }
    if (percentage >= 70) {
      return { color: '#f59e0b', label: 'Filling Up', icon: '🟡', percentage: Math.round(percentage) };
    }
    return { color: '#10b981', label: 'Available', icon: '🟢', percentage: Math.round(percentage) };
  }, [currentCapacity, station.capacity]);

  // ✅ OPTIMIZATION: Memoize hours formatting
  const formattedHours = useMemo(() => {
    if (!station.timings) return 'Check hours';
    if (station.timings.is24Hours) return 'Open 24/7';
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const todaySchedule = station.timings[today];
    
    if (!todaySchedule || todaySchedule.closed) {
      return 'Closed Today';
    }
    
    return `${todaySchedule.open} - ${todaySchedule.close}`;
  }, [station.timings]);

  // ✅ OPTIMIZATION: Memoize current photo
  const currentPhoto = useMemo(() => {
    if (!station.photos || station.photos.length === 0) return null;
    return station.photos[currentImageIndex];
  }, [station.photos, currentImageIndex]);

  // ✅ OPTIMIZATION: Memoize photo navigation handlers
  const nextPhoto = useCallback((e) => {
    e.stopPropagation();
    if (!station.photos || station.photos.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % station.photos.length);
  }, [station.photos]);

  const prevPhoto = useCallback((e) => {
    e.stopPropagation();
    if (!station.photos || station.photos.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + station.photos.length) % station.photos.length);
  }, [station.photos]);

  // ✅ OPTIMIZATION: Memoize image error handler
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // ✅ OPTIMIZATION: Memoize capacity style object
  const capacityBadgeStyle = useMemo(() => ({
    color: capacityStatus.color,
    borderColor: capacityStatus.color
  }), [capacityStatus.color]);

  // ✅ OPTIMIZATION: Memoize capacity display text
  const capacityText = useMemo(() => {
    if (currentCapacity != null && station.capacity) {
      return `${currentCapacity}/${station.capacity} bags`;
    }
    if (station.capacity) {
      return `${station.capacity} bags max`;
    }
    return 'Available';
  }, [currentCapacity, station.capacity]);

  const hasMultiplePhotos = station.photos && station.photos.length > 1;

  return (
    <div className={`${styles.previewCard} ${styles[mode]}`}>
      {/* Close Button */}
      {onClose && (
        <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
          <X size={20} />
        </button>
      )}

      {/* Station Image */}
      <div className={styles.imageContainer}>
        {!imageError && currentPhoto ? (
          <>
            <img
              src={currentPhoto}
              alt={station.name}
              onError={handleImageError}
              className={styles.stationImage}
              loading="lazy" // ✅ Native lazy loading
            />
            
            {/* Photo Navigation */}
            {hasMultiplePhotos && (
              <>
                <button 
                  onClick={prevPhoto} 
                  className={`${styles.photoNav} ${styles.photoNavPrev}`}
                  aria-label="Previous photo"
                >
                  ←
                </button>
                <button 
                  onClick={nextPhoto} 
                  className={`${styles.photoNav} ${styles.photoNavNext}`}
                  aria-label="Next photo"
                >
                  →
                </button>
                <div className={styles.photoIndicator}>
                  {currentImageIndex + 1} / {station.photos.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className={styles.imageFallback}>
            🏪
          </div>
        )}
        
        {/* Capacity Badge */}
        <div 
          className={styles.capacityBadge}
          style={capacityBadgeStyle} // ✅ Memoized style object
        >
          <span>{capacityStatus.icon}</span>
          <span>{capacityStatus.label}</span>
        </div>
      </div>

      {/* Station Info */}
      <div className={styles.stationInfo}>
        {/* Name */}
        <h2 className={styles.stationName}>{station.name}</h2>

        {/* Location */}
        <div className={styles.locationRow}>
          <MapPin size={16} className={styles.locationIcon} />
          <span className={styles.locationText}>{station.location}</span>
          {station.distance != null && (
            <span className={styles.distanceBadge}>
              {station.distance.toFixed(1)} km away
            </span>
          )}
        </div>

        {/* Details Grid */}
        <div className={styles.detailsGrid}>
          {/* Hours */}
          <div className={styles.detailItem}>
            <Clock size={18} className={styles.detailIcon} />
            <div>
              <div className={styles.detailLabel}>Hours</div>
              <div className={styles.detailValue}>{formattedHours}</div>
            </div>
          </div>

          {/* Capacity */}
          <div className={styles.detailItem}>
            <TrendingUp size={18} className={styles.detailIcon} />
            <div>
              <div className={styles.detailLabel}>Capacity</div>
              <div className={styles.detailValue}>{capacityText}</div>
            </div>
          </div>

          {/* Rating */}
          <div className={styles.detailItem}>
            <Star size={18} className={styles.detailIconStar} />
            <div>
              <div className={styles.detailLabel}>Rating</div>
              <div className={styles.detailValue}>4.8 ★ (New)</div>
            </div>
          </div>

          {/* Price */}
          <div className={styles.detailItem}>
            <DollarSign size={18} className={styles.detailIconPrice} />
            <div>
              <div className={styles.detailLabel}>From</div>
              <div className={styles.detailValuePrice}>A$3.99/day</div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {station.description && (
        <div className={styles.description}>
          <p>{station.description}</p>
        </div>
      )}

      {/* Features */}
      <div className={styles.features}>
        <div className={styles.featureItem}>✓ 24/7 Security</div>
        <div className={styles.featureItem}>✓ A$2000 Insurance</div>
        <div className={styles.featureItem}>✓ Easy Access</div>
        <div className={styles.featureItem}>✓ Instant Booking</div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        {/* Primary CTA */}
        <button onClick={onBook} className={styles.bookBtn}>
          <Award size={20} />
          Book This Station
        </button>

        {/* Secondary Actions */}
        <div className={styles.secondaryActions}>
          {onViewOnMap && (
            <button onClick={onViewOnMap} className={styles.secondaryBtn}>
              <Map size={16} />
              View on Map
            </button>
          )}
          
          <button onClick={onClose} className={styles.secondaryBtn}>
            Change Station
          </button>
        </div>
      </div>
    </div>
  );
});

// ✅ Add display name for debugging
StationPreviewCard.displayName = 'StationPreviewCard';

export default StationPreviewCard;