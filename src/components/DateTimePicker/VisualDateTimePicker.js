// components/DateTimePicker/VisualDateTimePicker.jsx - ENHANCED WITH SMOOTH UX + NOW OPTION
"use client";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import styles from './VisualDateTimePicker.module.css';

const VisualDateTimePicker = ({
  dropOffValue,
  pickUpValue,
  onChange,
  stationTimings = null,
  disabled = false
}) => {
  const [activeTab, setActiveTab] = useState('dropOff');
  const [dropOffDate, setDropOffDate] = useState('today');
  const [pickUpDate, setPickUpDate] = useState('today');
  const [customDropOffDate, setCustomDropOffDate] = useState(null);
  const [customPickUpDate, setCustomPickUpDate] = useState(null);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  
  // 🎯 NEW: UX Enhancement States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedDropOffSlot, setSelectedDropOffSlot] = useState(null);
  const [selectedPickUpSlot, setSelectedPickUpSlot] = useState(null);
  const [pulsePickUpTab, setPulsePickUpTab] = useState(false);
  const [pulseContinueButton, setPulseContinueButton] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const containerRef = useRef(null);
  const pickUpTabRef = useRef(null);

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

  // ✅ NEW: Get exact current time (not rounded)
  const getExactCurrentTime = () => {
    const now = new Date();
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

  // Check if pick-up time is valid
  const isPickUpTimeValid = (pickUpDateTime) => {
    if (!dropOffValue) return true;

    const dropOff = new Date(dropOffValue);
    const pickUp = new Date(pickUpDateTime);
    
    const minPickUpTime = new Date(dropOff.getTime() + 60 * 60 * 1000);
    
    return pickUp >= minPickUpTime;
  };

  // Generate time slots
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

    // ✅ NEW: Add "Now" option for drop-off on today
    if (!isPickUpTab && dateType === 'today') {
      const exactNow = getExactCurrentTime();
      const nowAvailable = isTimeSlotAvailable(targetDate, exactNow.getHours(), exactNow.getMinutes());
      
      if (nowAvailable) {
        const displayHour = exactNow.getHours() === 0 ? 12 : exactNow.getHours() > 12 ? exactNow.getHours() - 12 : exactNow.getHours();
        const period = exactNow.getHours() >= 12 ? 'PM' : 'AM';
        const label = `${displayHour}:${String(exactNow.getMinutes()).padStart(2, '0')} ${period}`;
        
        slots.push({
          type: 'now',
          hour: exactNow.getHours(),
          minute: exactNow.getMinutes(),
          label: 'Now',
          sublabel: label,
          available: true,
          dateTime: exactNow
        });
      }
    }

    let startHour = 0;
    let startMinute = 0;

    if (dateType === 'today') {
      const futureTime = new Date(now.getTime() + 30 * 60000);
      startHour = futureTime.getHours();
      startMinute = futureTime.getMinutes() >= 30 ? 30 : 0;
    }

    if (isPickUpTab && dropOffValue) {
      const dropOff = new Date(dropOffValue);
      const minPickUp = new Date(dropOff.getTime() + 60 * 60 * 1000);
      
      if (targetDate.toDateString() === dropOff.toDateString()) {
        startHour = minPickUp.getHours();
        startMinute = minPickUp.getMinutes() >= 30 ? 30 : 0;
      }
    }

    let lastSlotWasAvailable = false;
    let gapDetected = false;

    for (let hour = startHour; hour < 24; hour++) {
      for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
        const slotDate = new Date(targetDate);
        slotDate.setHours(hour, minute, 0, 0);
        
        const available = isTimeSlotAvailable(targetDate, hour, minute);
        const validPickUp = isPickUpTab ? isPickUpTimeValid(slotDate) : true;
        
        if (lastSlotWasAvailable && !available) {
          gapDetected = true;
        }
        
        if (gapDetected && available && !lastSlotWasAvailable) {
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
        true
      );
    }
  }, [activeTab, dropOffDate, pickUpDate, customDropOffDate, customPickUpDate, stationTimings, dropOffValue]);

  // 🎯 NEW: Smooth scroll to top
  const smoothScrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // 🎯 NEW: Show toast message
  const displayToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 🎯 NEW: Enhanced time slot selection
  const handleTimeSelect = (slot) => {
    const isDropOff = activeTab === 'dropOff';
    const dateType = isDropOff ? dropOffDate : pickUpDate;
    const customDate = isDropOff ? customDropOffDate : customPickUpDate;

    let targetDate;
    if (dateType === 'today') {
      targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
    } else if (dateType === 'tomorrow') {
      targetDate = getTomorrowDate();
    } else if (dateType === 'custom' && customDate) {
      const [year, month, day] = customDate.split('-').map(Number);
      targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    targetDate.setHours(slot.hour, slot.minute, 0, 0);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');
    const localISOTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    onChange({
      target: {
        name: isDropOff ? 'dropOffDate' : 'pickUpDate',
        value: localISOTime
      }
    });

    // 🎯 NEW: Enhanced UX Flow
    if (isDropOff) {
      // Save selected slot for visual feedback
      setSelectedDropOffSlot(slot.type === 'now' ? 'Now' : slot.label);
      
      // Show success toast
      const dateStr = dateType === 'today' ? 'Today' : 
                      dateType === 'tomorrow' ? 'Tomorrow' : 
                      targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = slot.type === 'now' ? slot.sublabel : slot.label;
      displayToast(`✓ Drop-off set for ${dateStr} at ${timeStr}`);
      
      // Smooth scroll to top after brief delay
      setTimeout(() => {
        smoothScrollToTop();
      }, 400);
      
      // Pulse pick-up tab to draw attention
      setTimeout(() => {
        setPulsePickUpTab(true);
        setTimeout(() => setPulsePickUpTab(false), 1800);
      }, 900);
      
      // Auto-switch to pick-up tab
      setTimeout(() => {
        setActiveTab('pickUp');
      }, 1200);
    } else {
      // Pick-up selected
      setSelectedPickUpSlot(slot.label);
      
      // Show summary
      setShowSummary(true);
      
      // Scroll to bottom (where button is)
      setTimeout(() => {
        if (containerRef.current) {
          const containerBottom = containerRef.current.scrollHeight;
          containerRef.current.parentElement?.scrollTo({
            top: containerBottom,
            behavior: 'smooth'
          });
        }
      }, 300);
      
      // Pulse the continue button (external - parent will handle)
      setPulseContinueButton(true);
      setTimeout(() => setPulseContinueButton(false), 1800);
    }
  };

  // 🎯 NEW: Expose pulse state to parent
  useEffect(() => {
    if (pulseContinueButton && onChange.onPickUpComplete) {
      onChange.onPickUpComplete();
    }
  }, [pulseContinueButton]);

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

  const handleCustomDateSelect = (dateStr) => {
    if (activeTab === 'dropOff') {
      setCustomDropOffDate(dateStr);
    } else {
      if (dropOffValue) {
        const dropOffDate = new Date(dropOffValue);
        dropOffDate.setHours(0, 0, 0, 0);
        const selectedDate = new Date(dateStr);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < dropOffDate) {
          alert('Pick-up date cannot be before drop-off date');
          return;
        }
      }
      setCustomPickUpDate(dateStr);
    }
    setShowCustomCalendar(false);
  };

  const formatTabDisplay = (value, dateType, customDate) => {
    if (!value) return { date: 'Select', time: '' };

    const date = new Date(value);
    
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

    return { date: dateStr, time: timeStr };
  };

  const dropOffDisplay = formatTabDisplay(dropOffValue, dropOffDate, customDropOffDate);
  const pickUpDisplay = formatTabDisplay(pickUpValue, pickUpDate, customPickUpDate);

  // Mini calendar
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

      let minDate = today;
      if (activeTab === 'pickUp' && dropOffValue) {
        const dropOffDate = new Date(dropOffValue);
        dropOffDate.setHours(0, 0, 0, 0);
        minDate = dropOffDate;
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

  if (disabled) {
    return (
      <div className={styles.disabledState}>
        <span className={styles.disabledIcon}>📍</span>
        <span className={styles.disabledText}>Please select a station first to choose date & time</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.container}>
      {/* 🎯 NEW: Success Toast */}
      {showToast && (
        <div className={styles.successToast}>
          {toastMessage}
        </div>
      )}

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
          ref={pickUpTabRef}
          type="button"
          onClick={() => setActiveTab('pickUp')}
          className={`${styles.tabButton} ${activeTab === 'pickUp' ? styles.tabActive : ''} ${pulsePickUpTab ? styles.pulseTab : ''}`}
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

      {/* Helper text for pick-up tab */}
      {activeTab === 'pickUp' && dropOffValue && !pickUpValue && (
        <div className={styles.helperText}>
          <span className={styles.helperIcon}>👇</span>
          <span>Now select when you&apos;ll pick up your luggage</span>
        </div>
      )}

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
                
                // ✅ NEW: Handle "Now" slot differently
                if (slot.type === 'now') {
                  const isSelected = selectedDropOffSlot === 'Now';
                  
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleTimeSelect(slot)}
                      className={`${styles.timeSlotButton} ${styles.nowButton} ${isSelected ? styles.selectedSlot : ''}`}
                    >
                      <div className={styles.nowLabel}>
                        <span className={styles.nowIcon}>⚡</span>
                        <span className={styles.nowText}>Now</span>
                      </div>
                      <div className={styles.nowSublabel}>{slot.sublabel}</div>
                      {isSelected && <span className={styles.checkmark}>✓</span>}
                    </button>
                  );
                }
                
                // Regular time slot
                const isSelected = activeTab === 'dropOff' 
                  ? selectedDropOffSlot === slot.label 
                  : selectedPickUpSlot === slot.label;
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleTimeSelect(slot)}
                    className={`${styles.timeSlotButton} ${isSelected ? styles.selectedSlot : ''}`}
                  >
                    {slot.label}
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 🎯 NEW: Success Summary */}
      {showSummary && dropOffValue && pickUpValue && (
        <div className={styles.successSummary}>
          <div className={styles.summaryHeader}>
            <span className={styles.summaryIcon}>✓</span>
            <span className={styles.summaryTitle}>Times Confirmed</span>
          </div>
          <div className={styles.summaryDetails}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Drop-off:</span>
              <span className={styles.summaryValue}>{dropOffDisplay.date}, {dropOffDisplay.time}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Pick-up:</span>
              <span className={styles.summaryValue}>{pickUpDisplay.date}, {pickUpDisplay.time}</span>
            </div>
          </div>
          <div className={styles.summaryAction}>
            <span className={styles.actionIcon}>👇</span>
            <span className={styles.actionText}>Tap &quot;Continue&quot; below to proceed</span>
          </div>
        </div>
      )}

      {/* Bottom Summary (existing) */}
      {dropOffValue && pickUpValue && !showSummary && (
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