// components/DateTimePicker/VisualDateTimePicker.jsx - UPDATED
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import styles from './VisualDateTimePicker.module.css';

const VisualDateTimePicker = ({ 
  value, 
  onChange, 
  minDate,
  label,
  icon = "📅",
  stationTimings = null,
  type = "dropOff", // "dropOff" or "pickUp"
  disabled = false  // ✅ NEW: Add disabled prop
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState('date'); // 'date' or 'time'

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setSelectedTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    }
  }, [value]);

  const formatDisplayValue = () => {
    if (!value) return 'Select date & time';
    const date = new Date(value);
    return date.toLocaleString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const isDateDisabled = (date) => {
    if (!minDate) return false;
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < min;
  };

  const isTimeSlotAvailable = (hour, minute) => {
    if (!stationTimings || stationTimings.is24Hours) return true;
    
    if (!selectedDate) return true;
    
    const testDate = new Date(selectedDate);
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
    
    // Cross-midnight check
    if (closeMinutes < openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    } else {
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const available = isTimeSlotAvailable(hour, minute);
        slots.push({
          hour,
          minute,
          label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          available
        });
      }
    }
    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), [selectedDate, stationTimings]);

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={styles.calendarDay} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isDisabled = isDateDisabled(date);
      const isSelected = selectedDate && 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year;
      const isToday = new Date().toDateString() === date.toDateString();
      
      days.push(
        <button
          key={day}
          type="button"
          className={`${styles.calendarDay} ${styles.calendarDayActive} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
          disabled={isDisabled}
          onClick={() => {
            setSelectedDate(date);
            setView('time');
          }}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  const handleTimeSelect = (slot) => {
    if (!slot.available || !selectedDate) return;
    
    const newDate = new Date(selectedDate);
    newDate.setHours(slot.hour, slot.minute, 0, 0);
    
    const offset = newDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(newDate.getTime() - offset).toISOString().slice(0, 16);
    
    onChange({ target: { name: type, value: localISOTime } });
    setIsOpen(false);
    setView('date');
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isPreviousMonthDisabled = () => {
    if (!minDate) return false;
    const min = new Date(minDate);
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    return prevMonth < new Date(min.getFullYear(), min.getMonth());
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <span className={styles.labelIcon}>{icon}</span>
        {label}
      </label>
      
      <div className={styles.inputWrapper}>
        <button
          type="button"
          className={`${styles.input} ${disabled ? styles.disabled : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={styles.inputValue}>{formatDisplayValue()}</span>
          <span className={styles.inputIcon}>{isOpen ? '▲' : '▼'}</span>
        </button>
        
        {isOpen && !disabled && (
          <div className={styles.dropdown}>
            {view === 'date' && (
              <div className={styles.calendarView}>
                <div className={styles.calendarHeader}>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={goToPreviousMonth}
                    disabled={isPreviousMonthDisabled()}
                  >
                    ←
                  </button>
                  <span className={styles.monthYear}>
                    {currentMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={goToNextMonth}
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
            )}
            
            {view === 'time' && (
              <div className={styles.timeView}>
                <div className={styles.timeHeader}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setView('date')}
                  >
                    ← Back to Calendar
                  </button>
                  <span className={styles.selectedDateDisplay}>
                    {selectedDate?.toLocaleDateString('en-AU', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                
                <div className={styles.timeSlots}>
                  {timeSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.timeSlot} ${!slot.available ? styles.timeSlotDisabled : ''} ${selectedTime === slot.label ? styles.timeSlotSelected : ''}`}
                      disabled={!slot.available}
                      onClick={() => handleTimeSelect(slot)}
                    >
                      {slot.label}
                      {!slot.available && <span className={styles.closedBadge}>Closed</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualDateTimePicker;