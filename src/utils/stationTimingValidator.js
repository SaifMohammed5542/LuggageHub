// utils/stationTimingValidator.js

/**
 * Validates if a given datetime falls within station operating hours
 * and suggests the nearest available time if closed
 * 
 * ✅ NOW SUPPORTS CROSS-MIDNIGHT HOURS (e.g., 7 AM - 2 AM next day)
 */

/**
 * Get day name from date
 */
const getDayName = (date) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Check if station is open at given datetime
 * ✅ FIXED: Now handles cross-midnight hours correctly
 */
export const isStationOpen = (dateTime, stationTimings) => {
  if (!dateTime || !stationTimings) return { isOpen: false, reason: 'Invalid data' };

  const date = new Date(dateTime);
  const dayName = getDayName(date);
  const currentTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  // Check if station is 24 hours
  if (stationTimings.is24Hours) {
    return { isOpen: true };
  }

  const dayTiming = stationTimings[dayName];
  
  // Check if station is closed that day
  if (dayTiming.closed) {
    return { 
      isOpen: false, 
      reason: 'Station is closed on this day',
      dayName 
    };
  }

  const currentMinutes = timeToMinutes(currentTime);
  const openMinutes = timeToMinutes(dayTiming.open);
  const closeMinutes = timeToMinutes(dayTiming.close);

  // ✅ FIX: Handle cross-midnight hours (e.g., 7 AM - 2 AM)
  let isOpen;
  
  if (closeMinutes < openMinutes) {
    // Cross-midnight: Station closes after midnight (e.g., 7 AM - 2 AM)
    // Open if current time is AFTER opening OR BEFORE closing
    isOpen = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  } else {
    // Same-day: Normal hours (e.g., 9 AM - 6 PM)
    isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  return {
    isOpen,
    reason: isOpen ? null : 'Station is closed at this time',
    dayName,
    openTime: dayTiming.open,
    closeTime: dayTiming.close,
    isCrossMidnight: closeMinutes < openMinutes
  };
};

/**
 * Find next available opening time
 * ✅ IMPROVED: Better handling for cross-midnight scenarios
 */
const findNextOpening = (fromDate, stationTimings, maxDaysAhead = 7) => {
  let checkDate = new Date(fromDate);
  
  for (let i = 0; i < maxDaysAhead; i++) {
    const dayName = getDayName(checkDate);
    const dayTiming = stationTimings[dayName];
    
    if (!dayTiming.closed) {
      const openMinutes = timeToMinutes(dayTiming.open);
      const closeMinutes = timeToMinutes(dayTiming.close);
      const isCrossMidnight = closeMinutes < openMinutes;
      
      // Get current time in minutes
      const currentMinutes = checkDate.getHours() * 60 + checkDate.getMinutes();
      
      // If cross-midnight and we're in the "after midnight" window
      if (i === 0 && isCrossMidnight && currentMinutes <= closeMinutes) {
        // We're already in an open period (after midnight but before close)
        return null; // Should already be detected as open
      }
      
      // Station opens this day
      const openTime = dayTiming.open;
      const [hours, minutes] = openTime.split(':').map(Number);
      
      const openingDateTime = new Date(checkDate);
      openingDateTime.setHours(hours, minutes, 0, 0);
      
      // If this is the same day and we're before opening time, return opening time
      if (i === 0 && openingDateTime > fromDate) {
        return openingDateTime;
      }
      
      // If checking future days, return opening time of that day
      if (i > 0) {
        return openingDateTime;
      }
    }
    
    // Move to next day
    checkDate.setDate(checkDate.getDate() + 1);
    checkDate.setHours(0, 0, 0, 0);
  }
  
  return null;
};

/**
 * Find previous closing time (last moment station was open)
 * ✅ IMPROVED: Better handling for cross-midnight scenarios
 */
const findPreviousClosing = (fromDate, stationTimings, maxDaysBack = 7) => {
  let checkDate = new Date(fromDate);
  
  for (let i = 0; i < maxDaysBack; i++) {
    const dayName = getDayName(checkDate);
    const dayTiming = stationTimings[dayName];
    
    if (!dayTiming.closed) {
      const closeTime = dayTiming.close;
      const [hours, minutes] = closeTime.split(':').map(Number);
      
      const closingDateTime = new Date(checkDate);
      closingDateTime.setHours(hours, minutes, 0, 0);
      
      // If this is the same day and we're after closing time, return closing time
      if (i === 0 && closingDateTime < fromDate) {
        return closingDateTime;
      }
      
      // If checking past days, return closing time of that day
      if (i > 0) {
        return closingDateTime;
      }
    }
    
    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1);
    checkDate.setHours(23, 59, 59, 999);
  }
  
  return null;
};

/**
 * Get nearest available time suggestion
 */
export const getNearestAvailableTime = (dateTime, stationTimings) => {
  if (!dateTime || !stationTimings) return null;

  const date = new Date(dateTime);
  const now = new Date();
  
  // Check if station is 24 hours
  if (stationTimings.is24Hours) {
    return { isValid: true };
  }

  // Check current status
  const status = isStationOpen(dateTime, stationTimings);
  
  if (status.isOpen) {
    return { isValid: true };
  }

  // Find nearest alternatives
  const nextOpening = findNextOpening(date, stationTimings);
  const prevClosing = findPreviousClosing(date, stationTimings);
  
  // Calculate time differences
  const suggestions = [];
  
  if (nextOpening && nextOpening >= now) {
    const diffMs = Math.abs(nextOpening - date);
    suggestions.push({
      type: 'after',
      dateTime: nextOpening,
      difference: diffMs,
      label: 'Next available opening'
    });
  }
  
  if (prevClosing && prevClosing >= now) {
    const diffMs = Math.abs(date - prevClosing);
    suggestions.push({
      type: 'before',
      dateTime: prevClosing,
      difference: diffMs,
      label: 'Last available time before'
    });
  }
  
  // Sort by smallest difference
  suggestions.sort((a, b) => a.difference - b.difference);
  
  return {
    isValid: false,
    reason: status.reason,
    dayName: status.dayName,
    openTime: status.openTime,
    closeTime: status.closeTime,
    suggestions
  };
};

/**
 * Format datetime for display
 */
export const formatDateTime = (dateTime) => {
  const date = new Date(dateTime);
  return date.toLocaleString('en-AU', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format datetime for datetime-local input
 */
export const formatDateTimeLocal = (dateTime) => {
  const date = new Date(dateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};