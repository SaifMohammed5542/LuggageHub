// utils/stationTimingValidator.js

/**
 * Validates if a given datetime falls within station operating hours
 * and suggests the nearest available time if closed
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

  const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

  return {
    isOpen,
    reason: isOpen ? null : 'Station is closed at this time',
    dayName,
    openTime: dayTiming.open,
    closeTime: dayTiming.close
  };
};

/**
 * Find next available opening time
 */
const findNextOpening = (fromDate, stationTimings, maxDaysAhead = 7) => {
  let checkDate = new Date(fromDate);
  
  for (let i = 0; i < maxDaysAhead; i++) {
    const dayName = getDayName(checkDate);
    const dayTiming = stationTimings[dayName];
    
    if (!dayTiming.closed) {
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
