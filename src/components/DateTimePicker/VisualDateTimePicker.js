// components/DateTimePicker/VisualDateTimePicker.jsx - BOUNCE STYLE WITH VALIDATION
"use client";
import React, { useState, useMemo } from 'react';
import styles from './VisualDateTimePicker.module.css';

const VisualDateTimePicker = ({
  dropOffValue,
  pickUpValue,
  onChange,
  stationTimings = null,
  // minDate,
  disabled = false
}) => {
  const [activeTab, setActiveTab] = useState('dropOff'); // 'dropOff' or 'pickUp'
  const [dropOffDate, setDropOffDate] = useState('today');
  const [pickUpDate, setPickUpDate] = useState('today');
  const [customDropOffDate, setCustomDropOffDate] = useState(null);
  const [customPickUpDate, setCustomPickUpDate] = useState(null);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  // Get current date/time
  const getCurrentDateTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  };

  // Get tomorrow's date
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  };

  // Check if time slot is available based on station hours
  const isTimeSlotAvailable = (date, hour, minute) => {
    if (!stationTimings || stationTimings.is24Hours) return true;

    const testDate = new Date(date);
    testDate.setHours(hour, minute, 0, 0);

    const dayOfWeek = testDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const daySchedule = stationTimings[dayName];

    if (!daySchedule || daySchedule.closed) return false;

    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const openTime = daySchedule.open;
    const closeTime = daySchedule.close;

    const timeToMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const currentMinutes = timeToMinutes(timeStr);
    const openMinutes = timeToMinutes(openTime);
    const closeMinutes = timeToMinutes(closeTime);

    if (closeMinutes < openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    } else {
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    }
  };

  // ✅ NEW: Check if pick-up time is valid (must be after drop-off + 1 hour minimum)
  const isPickUpTimeValid = (pickUpDateTime) => {
    if (!dropOffValue) return true; // No drop-off selected yet, allow all times

    const dropOff = new Date(dropOffValue);
    const pickUp = new Date(pickUpDateTime);
    
    // Pick-up must be at least 1 hour after drop-off
    const minPickUpTime = new Date(dropOff.getTime() + 60 * 60 * 1000);
    
    return pickUp >= minPickUpTime;
  };

  
  // Generate time slots for a given date (30-minute intervals)
  const generateTimeSlots = (dateType, customDate = null, isPickUpTab = false) => {
    const slots = [];
    const now = getCurrentDateTime();
    let targetDate;

    if (dateType === 'today') {
      targetDate = new Date();
    } else if (dateType === 'tomorrow') {
      targetDate = getTomorrowDate();
    } else if (dateType === 'custom' && customDate) {
      targetDate = new Date(customDate);
    } else {
      return slots;
    }

    // For today, start from current time + 30 minutes
    let startHour = 0;
    let startMinute = 0;

    if (dateType === 'today') {
      const futureTime = new Date(now.getTime() + 30 * 60000);
      startHour = futureTime.getHours();
      startMinute = futureTime.getMinutes() >= 30 ? 30 : 0;
    }

    // ✅ NEW: For pick-up tab, enforce minimum 1 hour after drop-off
    if (isPickUpTab && dropOffValue) {
      const dropOff = new Date(dropOffValue);
      const minPickUp = new Date(dropOff.getTime() + 60 * 60 * 1000);
      
      // If the target date is the same as drop-off date, adjust start time
      if (targetDate.toDateString() === dropOff.toDateString()) {
        startHour = minPickUp.getHours();
        startMinute = minPickUp.getMinutes() >= 30 ? 30 : 0;
      }
    }

    let lastSlotWasAvailable = false;
    let gapDetected = false;

    // Generate 30-minute slots
    for (let hour = startHour; hour < 24; hour++) {
      for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
        const slotDate = new Date(targetDate);
        slotDate.setHours(hour, minute, 0, 0);
        
        const available = isTimeSlotAvailable(targetDate, hour, minute);
        
        // ✅ NEW: For pick-up, also check if it's after drop-off
        const validPickUp = isPickUpTab ? isPickUpTimeValid(slotDate) : true;
        
        // ✅ Detect gap between unavailable and available slots (station closed period)
        if (lastSlotWasAvailable && !available) {
          gapDetected = true;
        }
        
        if (gapDetected && available && !lastSlotWasAvailable) {
          // Find the close and open times from station timings
          if (stationTimings && !stationTimings.is24Hours) {
            const dayOfWeek = targetDate.getDay();
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[dayOfWeek];
            const daySchedule = stationTimings[dayName];
            
            if (daySchedule) {
              slots.push({
                type: 'separator',
                closeTime: daySchedule.close,
                openTime: daySchedule.open
              });
            }
          }
          gapDetected = false;
        }
        
        if (available && validPickUp) {
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          const period = hour >= 12 ? 'PM' : 'AM';
          const label = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;

          slots.push({
            type: 'slot',
            hour,
            minute,
            label,
            available,
            dateTime: slotDate
          });
          
          lastSlotWasAvailable = true;
        } else {
          lastSlotWasAvailable = false;
        }
      }
    }

    return slots;
  };

  // Get time slots based on active tab and selected date
  const currentTimeSlots = useMemo(() => {
    if (activeTab === 'dropOff') {
      return generateTimeSlots(
        dropOffDate,
        dropOffDate === 'custom' ? customDropOffDate : null,
        false
      );
    } else {
      return generateTimeSlots(
        pickUpDate,
        pickUpDate === 'custom' ? customPickUpDate : null,
        true // ✅ Pass isPickUpTab = true
      );
    }
  }, [activeTab, dropOffDate, pickUpDate, customDropOffDate, customPickUpDate, stationTimings, dropOffValue]);

  // ✅ DEBUG: Handle time slot selection with logging
  const handleTimeSelect = (slot) => {
    const isDropOff = activeTab === 'dropOff';
    const dateType = isDropOff ? dropOffDate : pickUpDate;
    const customDate = isDropOff ? customDropOffDate : customPickUpDate;

    console.log('🔍 DEBUG handleTimeSelect:');
    console.log('- activeTab:', activeTab);
    console.log('- dateType:', dateType);
    console.log('- customDate:', customDate);
    console.log('- slot:', slot);

    let targetDate;
    if (dateType === 'today') {
      targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
    } else if (dateType === 'tomorrow') {
      targetDate = getTomorrowDate();
    } else if (dateType === 'custom' && customDate) {
      console.log('- Creating date from customDate:', customDate);
      // Parse the date string as YYYY-MM-DD
      const [year, month, day] = customDate.split('-').map(Number);
      console.log('- Parsed:', { year, month, day });
      targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      console.log('- Created targetDate:', targetDate.toString());
    }

    // Set the selected time
    targetDate.setHours(slot.hour, slot.minute, 0, 0);
    console.log('- After setHours:', targetDate.toString());

    // Format as local datetime string (YYYY-MM-DDTHH:mm)
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');
    const localISOTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    console.log('- Final localISOTime:', localISOTime);
    console.log('- Sending to form with name:', isDropOff ? 'dropOffDate' : 'pickUpDate');

    onChange({
      target: {
        name: isDropOff ? 'dropOffDate' : 'pickUpDate',
        value: localISOTime
      }
    });

    // Auto-switch to Pick Up tab after Drop Off is selected
    if (isDropOff) {
      setTimeout(() => setActiveTab('pickUp'), 300);
    }
  };

  // Handle date type selection
  const handleDateTypeChange = (type) => {
    if (activeTab === 'dropOff') {
      setDropOffDate(type);
      if (type === 'custom') {
        setShowCustomCalendar(true);
      } else {
        setShowCustomCalendar(false);
      }
    } else {
      setPickUpDate(type);
      if (type === 'custom') {
        setShowCustomCalendar(true);
      } else {
        setShowCustomCalendar(false);
      }
    }
  };

  // ✅ FIXED: Handle custom date selection with validation
  const handleCustomDateSelect = (dateStr) => {
    if (activeTab === 'dropOff') {
      setCustomDropOffDate(dateStr);
    } else {
      // ✅ For pick-up, only block dates that are BEFORE drop-off date (not same day)
      if (dropOffValue) {
        const dropOffDate = new Date(dropOffValue);
        dropOffDate.setHours(0, 0, 0, 0); // Reset to start of day
        const selectedDate = new Date(dateStr);
        selectedDate.setHours(0, 0, 0, 0); // Reset to start of day
        
        // Only block if selected date is BEFORE drop-off date (not equal)
        if (selectedDate < dropOffDate) {
          alert('Pick-up date cannot be before drop-off date');
          return;
        }
        // If same day, time validation will handle the rest
      }
      setCustomPickUpDate(dateStr);
    }
    setShowCustomCalendar(false);
  };

  // ✅ DEBUG: Format display value for tabs
  const formatTabDisplay = (value, dateType, customDate) => {
    console.log('🎨 DEBUG formatTabDisplay:');
    console.log('- value:', value);
    console.log('- dateType:', dateType);
    console.log('- customDate:', customDate);
    
    if (!value) return { date: 'Select', time: '' };

    // Parse the datetime string (YYYY-MM-DDTHH:mm format)
    const date = new Date(value);
    console.log('- Parsed date object:', date.toString());
    
    const hour = date.getHours();
    const minute = date.getMinutes();
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const timeStr = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;

    let dateStr;
    if (dateType === 'today') {
      dateStr = 'Today';
    } else if (dateType === 'tomorrow') {
      dateStr = 'Tomorrow';
    } else if (dateType === 'custom' && customDate) {
      const customDateObj = new Date(customDate + 'T00:00:00');
      dateStr = customDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    console.log('- Final display:', { date: dateStr, time: timeStr });
    return { date: dateStr, time: timeStr };
  };

  const dropOffDisplay = formatTabDisplay(dropOffValue, dropOffDate, customDropOffDate);
  const pickUpDisplay = formatTabDisplay(pickUpValue, pickUpDate, customPickUpDate);

  // Mini calendar for custom date selection
  const MiniCalendar = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      return { daysInMonth, startingDayOfWeek, year, month };
    };

    const isPreviousMonthDisabled = () => {
      const today = new Date();
      const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
      return prevMonth < new Date(today.getFullYear(), today.getMonth());
    };

    const renderCalendar = () => {
      const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
      const days = [];

      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className={styles.calendarDay} />);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ✅ FIXED: For pick-up calendar, only disable dates BEFORE drop-off (not same day)
      let minDate = today;
      if (activeTab === 'pickUp' && dropOffValue) {
        const dropOffDate = new Date(dropOffValue);
        dropOffDate.setHours(0, 0, 0, 0);
        minDate = dropOffDate; // Allow same day, time filtering will handle it
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day, 0, 0, 0, 0);
        const isDisabled = date < minDate;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        days.push(
          <button
            key={day}
            type="button"
            disabled={isDisabled}
            onClick={() => handleCustomDateSelect(dateStr)}
            className={`${styles.calendarDay} ${styles.calendarDayActive} ${isDisabled ? styles.disabled : ''}`}
          >
            {day}
          </button>
        );
      }

      return days;
    };

    return (
      <div className={styles.miniCalendar}>
        <div className={styles.calendarHeader}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            disabled={isPreviousMonthDisabled()}
          >
            ←
          </button>
          <span className={styles.monthYear}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            →
          </button>
        </div>

        <div className={styles.weekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={styles.weekday}>{day}</div>
          ))}
        </div>

        <div className={styles.calendarGrid}>
          {renderCalendar()}
        </div>
      </div>
    );
  };

  // Disabled state
  if (disabled) {
    return (
      <div className={styles.disabledState}>
        <span className={styles.disabledIcon}>📍</span>
        <span className={styles.disabledText}>Please select a station first to choose date & time</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Tab Headers */}
      <div className={styles.tabHeaders}>
        <button
          type="button"
          onClick={() => setActiveTab('dropOff')}
          className={`${styles.tabButton} ${activeTab === 'dropOff' ? styles.tabActive : ''}`}
        >
          <div className={styles.tabLabel}>DROP OFF</div>
          <div className={styles.tabDate}>{dropOffDisplay.date}</div>
          <div className={styles.tabTime}>{dropOffDisplay.time || 'Select time'}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pickUp')}
          className={`${styles.tabButton} ${activeTab === 'pickUp' ? styles.tabActive : ''}`}
          disabled={!dropOffValue}
        >
          <div className={styles.tabLabel}>PICK UP</div>
          <div className={styles.tabDate}>{pickUpDisplay.date}</div>
          <div className={styles.tabTime}>{pickUpDisplay.time || 'Select time'}</div>
          {!dropOffValue && (
            <div className={styles.tabDisabledHint}>Select drop-off first</div>
          )}
        </button>
      </div>

      {/* ✅ NEW: Warning if on pick-up tab without drop-off */}
      {activeTab === 'pickUp' && !dropOffValue && (
        <div className={styles.pickUpWarning}>
          <span className={styles.warningIcon}>⚠️</span>
          <span>Please select a drop-off time first</span>
        </div>
      )}

      {/* Date Selection */}
      <div className={styles.dateSection}>
        <div className={styles.sectionTitle}>Date</div>
        <div className={styles.dateButtons}>
          <button
            type="button"
            onClick={() => handleDateTypeChange('today')}
            className={`${styles.dateButton} ${(activeTab === 'dropOff' ? dropOffDate : pickUpDate) === 'today' ? styles.dateButtonActive : ''}`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => handleDateTypeChange('tomorrow')}
            className={`${styles.dateButton} ${(activeTab === 'dropOff' ? dropOffDate : pickUpDate) === 'tomorrow' ? styles.dateButtonActive : ''}`}
          >
            Tomorrow
            {activeTab === 'dropOff' && dropOffDate === 'tomorrow' && (
              <span className={styles.discountBadge}>-10%</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDateTypeChange('custom')}
            className={`${styles.dateButton} ${(activeTab === 'dropOff' ? dropOffDate : pickUpDate) === 'custom' ? styles.dateButtonActive : ''}`}
          >
            <span>📅</span> Custom
          </button>
        </div>
      </div>

      {/* Custom Calendar */}
      {showCustomCalendar && <MiniCalendar />}

      {/* Time Selection */}
      {!showCustomCalendar && (
        <div className={styles.timeSection}>
          <div className={styles.sectionTitle}>Time</div>
          <div className={styles.timeSlotList}>
            {currentTimeSlots.length === 0 ? (
              <div className={styles.noTimeSlots}>
                <span className={styles.noTimeSlotsIcon}>🕐</span>
                <div className={styles.noTimeSlotsTitle}>No available times</div>
                <div className={styles.noTimeSlotsText}>
                  {activeTab === 'pickUp' && dropOffValue
                    ? 'Pick-up must be at least 1 hour after drop-off'
                    : 'Station is closed or all slots are booked'}
                </div>
              </div>
            ) : (
              currentTimeSlots.map((slot, index) => {
                if (slot.type === 'separator') {
                  // Convert 24h to 12h format for display
                  const formatTime12h = (time24) => {
                    const [h, m] = time24.split(':').map(Number);
                    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    const period = h >= 12 ? 'PM' : 'AM';
                    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
                  };
                  
                  return (
                    <div key={index} className={styles.timeSeparator}>
                      <div className={styles.separatorLine} />
                      <div className={styles.separatorText}>
                        Station closed {formatTime12h(slot.closeTime)} - {formatTime12h(slot.openTime)}
                      </div>
                      <div className={styles.separatorLine} />
                    </div>
                  );
                }
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleTimeSelect(slot)}
                    className={styles.timeSlotButton}
                  >
                    {slot.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Bottom Summary */}
      {dropOffValue && pickUpValue && (
        <div className={styles.summary}>
          <div className={styles.summaryLabel}>Selected Times</div>
          <div className={styles.summaryValue}>
            {dropOffDisplay.date}, {dropOffDisplay.time}
            {" → "}
            {pickUpDisplay.date !== dropOffDisplay.date
              ? `${pickUpDisplay.date}, ${pickUpDisplay.time}`
              : pickUpDisplay.time}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualDateTimePicker;