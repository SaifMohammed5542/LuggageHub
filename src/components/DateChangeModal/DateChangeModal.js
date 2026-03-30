// components/DateChangeModal/DateChangeModal.js - ULTIMATE SIMPLE DATE CHANGER
"use client";

import { useState, useEffect } from "react";
import styles from "./DateChangeModal.module.css";
import ExtensionPayPal from "../ExtensionPayPal";

const LUGGAGE_PRICING = {
  small: 3.99,
  medium_large: 8.49,
};

const toDateTimeLocal = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function DateChangeModal({ booking, onClose, onSuccess }) {
  const [newDropOff, setNewDropOff] = useState("");
  const [newPickUp, setNewPickUp] = useState("");
  const [shiftMode, setShiftMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [stationTimings, setStationTimings] = useState(null);
  const [isLoadingTimings, setIsLoadingTimings] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const currentDropOff = new Date(booking.dropOffDate);
  const currentPickUp = new Date(booking.pickUpDate);
  const currentDays = Math.ceil((currentPickUp - currentDropOff) / (1000 * 60 * 60 * 24));

  // Initialize with current dates
  useEffect(() => {
    setNewDropOff(toDateTimeLocal(currentDropOff));
    setNewPickUp(toDateTimeLocal(currentPickUp));
  }, []);

  // ✅ Fetch station timings
  useEffect(() => {
    const fetchStationTimings = async () => {
      if (!booking.stationId?._id && !booking.stationId) return;
      
      const stationId = booking.stationId._id || booking.stationId;
      setIsLoadingTimings(true);
      
      try {
        const response = await fetch(`/api/station/${stationId}/timings`);
        if (!response.ok) {
          setStationTimings({ is24Hours: true });
          return;
        }
        const data = await response.json();
        if (data.success && data.timings) {
          setStationTimings(data.timings);
        } else {
          setStationTimings({ is24Hours: true });
        }
      } catch (error) {
        console.error("Failed to fetch station timings:", error);
        setStationTimings({ is24Hours: true });
      } finally {
        setIsLoadingTimings(false);
      }
    };

    fetchStationTimings();
  }, [booking.stationId]);

  // ✅ Validate station hours
  const validateStationHours = (dateTimeString) => {
    if (!stationTimings || stationTimings.is24Hours) return { valid: true, message: "" };

    const selectedDate = new Date(dateTimeString);
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const daySchedule = stationTimings[dayName];

    if (!daySchedule || daySchedule.closed) {
      return { 
        valid: false, 
        message: `Station closed on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}s` 
      };
    }

    const selectedHour = selectedDate.getHours();
    const selectedMinute = selectedDate.getMinutes();
    const selectedTime = selectedHour * 60 + selectedMinute;

    const [openHour, openMinute] = daySchedule.open.split(':').map(Number);
    const [closeHour, closeMinute] = daySchedule.close.split(':').map(Number);
    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    if (closeTime < openTime) {
      if (selectedTime >= openTime || selectedTime <= closeTime) {
        return { valid: true, message: "" };
      }
    } else {
      if (selectedTime >= openTime && selectedTime <= closeTime) {
        return { valid: true, message: "" };
      }
    }

    const formatTime = (hour, minute) => {
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
    };

    return { 
      valid: false, 
      message: `Station hours: ${formatTime(openHour, openMinute)} - ${formatTime(closeHour, closeMinute)}` 
    };
  };

  // ✅ Calculate changes and cost
  const calculateChanges = () => {
    if (!newDropOff || !newPickUp) return null;

    const requestedDropOff = new Date(newDropOff);
    const requestedPickUp = new Date(newPickUp);
    
    // Validation
    if (requestedDropOff >= requestedPickUp) {
      return { 
        valid: false, 
        error: "Drop-off must be before pick-up" 
      };
    }

    // Check minimum times
    const now = new Date();
    const hoursUntilDropOff = (requestedDropOff - now) / (1000 * 60 * 60);

    if (hoursUntilDropOff < 2 && requestedDropOff < currentDropOff) {
      return { 
        valid: false, 
        error: "Drop-off must be at least 2 hours from now" 
      };
    }

    // Check pick-up not moved earlier
    if (requestedPickUp < currentPickUp) {
      return { 
        valid: false, 
        error: "Cannot move pick-up earlier (no refunds for early pickup)" 
      };
    }

    // Validate station hours
    const dropOffValidation = validateStationHours(newDropOff);
    if (!dropOffValidation.valid) {
      return { valid: false, error: `Drop-off: ${dropOffValidation.message}` };
    }

    const pickUpValidation = validateStationHours(newPickUp);
    if (!pickUpValidation.valid) {
      return { valid: false, error: `Pick-up: ${pickUpValidation.message}` };
    }

    // Calculate new duration
    const newDays = Math.ceil((requestedPickUp - requestedDropOff) / (1000 * 60 * 60 * 24));
    const daysDifference = newDays - currentDays;
    
    // Calculate cost
    const dailyRate = 
      (booking.smallBagCount || 0) * LUGGAGE_PRICING.small +
      (booking.largeBagCount || 0) * LUGGAGE_PRICING.medium_large;
    
    let extraCharge = 0;
    let message = "";
    let warning = "";

    if (daysDifference > 0) {
      // More days = extra charge
      extraCharge = dailyRate * daysDifference;
      message = `Adding ${daysDifference} day${daysDifference === 1 ? '' : 's'}`;
    } else if (daysDifference < 0) {
      // Fewer days = no refund
      extraCharge = 0;
      const lostDays = Math.abs(daysDifference);
      warning = `You're losing ${lostDays} day${lostDays === 1 ? '' : 's'} with no refund`;
      message = "No refund for unused days";
    } else {
      // Same days
      message = "Same duration";
    }

    return {
      valid: true,
      newDays,
      currentDays,
      daysDifference,
      dailyRate,
      extraCharge,
      newTotalAmount: (booking.totalAmount || 0) + extraCharge,
      message,
      warning,
      needsPayment: extraCharge > 0
    };
  };

  const calculation = calculateChanges();

  // ✅ Handle shift mode
  useEffect(() => {
    if (!shiftMode) return;

    // When drop-off changes in shift mode, auto-adjust pick-up
    const handleShift = () => {
      if (!newDropOff) return;
      
      const newDropOffDate = new Date(newDropOff);
      const timeDiff = currentPickUp - currentDropOff; // Duration in ms
      const newPickUpDate = new Date(newDropOffDate.getTime() + timeDiff);

      setNewPickUp(toDateTimeLocal(newPickUpDate));
    };

    handleShift();
  }, [newDropOff, shiftMode]);

  // ✅ Handle drop-off change
  const handleDropOffChange = (e) => {
    setNewDropOff(e.target.value);
    setError(null);
    setShowPayment(false);
  };

  // ✅ Handle pick-up change
  const handlePickUpChange = (e) => {
    if (shiftMode) return; // Disabled in shift mode
    setNewPickUp(e.target.value);
    setError(null);
    setShowPayment(false);
  };

  // ✅ Handle save changes
  const handleSaveChanges = async () => {
    if (!calculation || !calculation.valid) {
      setError(calculation?.error || "Invalid dates");
      return;
    }

    if (calculation.needsPayment) {
      // Show PayPal
      setShowPayment(true);
    } else {
      // Update directly (no payment needed)
      await processUpdate(null);
    }
  };

  // ✅ Process the update
  const processUpdate = async (paymentData) => {
    setIsProcessing(true);
    try {
      // Refresh token
      let token = localStorage.getItem("token");
      
      if (token) {
        try {
          const refreshResponse = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.token) {
              token = refreshData.token;
              localStorage.setItem("token", token);
            }
          }
        } catch (refreshError) {
          console.warn("Token refresh failed:", refreshError);
        }
      }
      
      // Call API
      const response = await fetch("/api/user/change-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId: booking._id,
          newDropOffDate: newDropOff,
          newPickUpDate: newPickUp,
          paymentData: paymentData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          alert("Your session has expired. Please login again.");
          localStorage.clear();
          window.location.href = "/auth/login";
          return;
        }
        throw new Error(result.error || "Failed to update dates");
      }

      onSuccess(result);
    } catch (err) {
      console.error("Update error:", err);
      setError(err.message || "Failed to update booking");
      setIsProcessing(false);
    }
  };

  // ✅ Handle PayPal success
  const handlePaymentSuccess = async (paymentData) => {
    await processUpdate(paymentData);
  };

  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
    setIsProcessing(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <h2 className={styles.title}>Change Booking Dates</h2>

        {/* Current Booking Summary */}
        <div className={styles.currentBooking}>
          <h3 className={styles.sectionTitle}>Current Booking</h3>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Drop-off:</span>
            <span className={styles.summaryValue}>
              {currentDropOff.toLocaleDateString('en-AU')} {currentDropOff.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Pick-up:</span>
            <span className={styles.summaryValue}>
              {currentPickUp.toLocaleDateString('en-AU')} {currentPickUp.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Duration:</span>
            <span className={styles.summaryValue}>{currentDays} day{currentDays === 1 ? '' : 's'}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Amount Paid:</span>
            <span className={styles.summaryValue}>A${(booking.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Station Hours Info */}
        {stationTimings && !stationTimings.is24Hours && (
          <div className={styles.stationHoursInfo}>
            <span className={styles.hoursIcon}>🕐</span>
            <span className={styles.hoursText}>
              Station hours will be validated for your new dates
            </span>
          </div>
        )}

        <div className={styles.divider} />

        <h3 className={styles.sectionTitle}>Select New Dates</h3>

        {/* Shift Mode Toggle */}
        <div className={styles.shiftModeToggle}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={shiftMode}
              onChange={(e) => setShiftMode(e.target.checked)}
              className={styles.toggleCheckbox}
            />
            <span className={styles.toggleText}>
              🔄 Shift Mode (move both dates together, same duration)
            </span>
          </label>
          {shiftMode && (
            <p className={styles.shiftModeHint}>
              💡 When you change drop-off, pick-up will adjust automatically to keep the same duration
            </p>
          )}
        </div>

        {/* Drop-off Picker */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            📅 New Drop-off Date & Time
          </label>
          {isLoadingTimings ? (
            <div className={styles.loadingTimings}>⏳ Loading station hours...</div>
          ) : (
            <>
              <input
                type="datetime-local"
                value={newDropOff}
                onChange={handleDropOffChange}
                className={styles.dateInput}
              />
              <p className={styles.hint}>
                💡 Earlier = more days (extra charge) | Later = no refund
              </p>
            </>
          )}
        </div>

        {/* Pick-up Picker */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            📅 New Pick-up Date & Time
          </label>
          {isLoadingTimings ? (
            <div className={styles.loadingTimings}>⏳ Loading station hours...</div>
          ) : (
            <>
              <input
                type="datetime-local"
                value={newPickUp}
                onChange={handlePickUpChange}
                disabled={shiftMode}
                className={`${styles.dateInput} ${shiftMode ? styles.dateInputDisabled : ''}`}
              />
              <p className={styles.hint}>
                💡 Can only extend (no early pickup allowed)
                {shiftMode && " | Auto-adjusted in shift mode"}
              </p>
            </>
          )}
        </div>

        {/* Calculation Summary */}
        {calculation && calculation.valid && (
          <div className={styles.calculationCard}>
            <h3 className={styles.sectionTitle}>📊 Summary</h3>
            
            <div className={styles.calcRow}>
              <span>New Duration:</span>
              <span className={styles.calcValue}>
                {calculation.newDays} day{calculation.newDays === 1 ? '' : 's'}
              </span>
            </div>

            {calculation.daysDifference !== 0 && (
              <div className={styles.calcRow}>
                <span>{calculation.message}:</span>
                <span className={`${styles.calcValue} ${calculation.daysDifference > 0 ? styles.positive : styles.neutral}`}>
                  {calculation.daysDifference > 0 ? '+' : ''}{calculation.daysDifference} day{Math.abs(calculation.daysDifference) === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {calculation.warning && (
              <div className={styles.warningBox}>
                <span className={styles.warningIcon}>⚠️</span>
                <span>{calculation.warning}</span>
              </div>
            )}

            <div className={styles.divider} />

            <div className={styles.calcRow}>
              <span className={styles.totalLabel}>
                {calculation.extraCharge > 0 ? 'Extra Charge:' : 'Additional Cost:'}
              </span>
              <span className={styles.totalValue}>
                A${calculation.extraCharge.toFixed(2)}
              </span>
            </div>

            {calculation.extraCharge > 0 && (
              <div className={styles.calcRow}>
                <span>New Total:</span>
                <span className={styles.newTotal}>
                  A${calculation.newTotalAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {(error || (calculation && !calculation.valid)) && (
          <div className={styles.errorBox}>
            <span>⚠️</span>
            <span>{error || calculation?.error}</span>
          </div>
        )}

        {/* Action Buttons */}
        {!showPayment ? (
          <button
            className={styles.saveBtn}
            onClick={handleSaveChanges}
            disabled={!calculation || !calculation.valid || isProcessing}
          >
            {calculation && calculation.needsPayment 
              ? `💳 Save Changes & Pay A$${calculation.extraCharge.toFixed(2)}`
              : '✅ Save Changes (Free)'}
          </button>
        ) : (
          <>
            {isProcessing ? (
              <div className={styles.processing}>
                <div className={styles.spinner} />
                <p>Processing update...</p>
              </div>
            ) : (
              <ExtensionPayPal
                extensionAmount={calculation.extraCharge}
                bookingReference={booking.bookingReference}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}