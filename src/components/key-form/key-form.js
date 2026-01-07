"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./key-form.module.css";
import PayPalPayment from "../LuggagePay"; // Import PayPal component
import {
  getNearestAvailableTime,
  formatDateTime,
} from "@/utils/stationTimingValidator";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_RATE_PER_DAY = 9.99;

const getRoundedNow = () => {
  const now = new Date();
  const m = Math.ceil(now.getMinutes() / 15) * 15;
  now.setMinutes(m, 0, 0);
  return now;
};

const getMinDateTime = () =>
  new Date(getRoundedNow().getTime() - getRoundedNow().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const calcDays = (start, end) => {
  if (!start || !end) return 1;
  return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)));
};

const formatDateTimeLocal = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

// Generate 6-digit PIN
const generatePIN = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export default function KeyHandoverForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPriceSummary, setShowPriceSummary] = useState(false);
  const [generatedPIN, setGeneratedPIN] = useState("");
  const [copiedPIN, setCopiedPIN] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [formData, setFormData] = useState({
    // Key Details
    numberOfKeys: "1",
    keyTypes: [],
    otherKeyType: "",
    keyDescription: "",
    specialInstructions: "",
    
    // People
    dropName: "",
    dropEmail: "",
    pickupName: "",
    pickupEmail: "",
    
    // Location & Schedule
    stationId: "",
    dropOffDate: "",
    pickUpDate: "",
    
    // Terms
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({});
  const [stations, setStations] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [stationTimings, setStationTimings] = useState(null);
  const [timingAlert, setTimingAlert] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isCheckingTimings, setIsCheckingTimings] = useState(false);

  const hasTimingConflict = useMemo(() => {
    return Array.isArray(timingAlert) && timingAlert.length > 0;
  }, [timingAlert]);

  // Copy PIN to clipboard
  const copyPINToClipboard = () => {
    navigator.clipboard.writeText(generatedPIN);
    setCopiedPIN(true);
    setTimeout(() => setCopiedPIN(false), 2000);
  };

  // Prevent leaving page during payment
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isPaymentProcessing) {
        e.preventDefault();
        e.returnValue = "Your payment is currently being processed. Please do not close or refresh this page.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isPaymentProcessing]);

  // Fetch stations from API
  useEffect(() => {
    setIsLoadingStations(true);
    fetch("/api/station/list")
      .then((r) => r.json())
      .then((d) => {
        setStations(d.stations || []);
        setIsLoadingStations(false);
      })
      .catch((err) => {
        console.error("Failed to fetch stations:", err);
        setIsLoadingStations(false);
      });
  }, []);

  // Fetch station timings when station is selected
  useEffect(() => {
    const fetchStationTimings = async () => {
      if (!formData.stationId) {
        setStationTimings(null);
        return;
      }
      try {
        const response = await fetch(`/api/station/${formData.stationId}/timings`);
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
      }
    };
    fetchStationTimings();
  }, [formData.stationId]);

  const numberOfDays = useMemo(
    () => calcDays(formData.dropOffDate, formData.pickUpDate),
    [formData.dropOffDate, formData.pickUpDate]
  );

  const totalAmount = useMemo(() => numberOfDays * KEY_RATE_PER_DAY, [numberOfDays]);

  // Validate station timings
  const validateStationTimings = useCallback(() => {
    if (!stationTimings || stationTimings.is24Hours) {
      setTimingAlert(null);
      return;
    }

    setIsCheckingTimings(true);
    let alerts = [];

    if (formData.dropOffDate) {
      const dropOffValidation = getNearestAvailableTime(formData.dropOffDate, stationTimings);
      if (!dropOffValidation.isValid) {
        alerts.push({
          type: 'dropOff',
          message: 'Drop-off time falls when station is closed',
          details: dropOffValidation,
          selectedTime: formData.dropOffDate
        });
      }
    }

    if (formData.pickUpDate) {
      const pickUpValidation = getNearestAvailableTime(formData.pickUpDate, stationTimings);
      if (!pickUpValidation.isValid) {
        alerts.push({
          type: 'pickUp',
          message: 'Pick-up time falls when station is closed',
          details: pickUpValidation,
          selectedTime: formData.pickUpDate
        });
      }
    }

    setTimingAlert(alerts.length > 0 ? alerts : null);
    setIsCheckingTimings(false);
  }, [formData.dropOffDate, formData.pickUpDate, stationTimings]);

  // Run validation when dates or timings change
  useEffect(() => {
    if (formData.stationId && stationTimings && (formData.dropOffDate || formData.pickUpDate)) {
      validateStationTimings();
    }
  }, [formData.stationId, stationTimings, validateStationTimings]);

  // Apply suggested time from timing alert
  const applySuggestedTime = (timeType, suggestedDateTime) => {
    const asDate = (d) => (d instanceof Date ? d : new Date(d));
    
    if (timeType === 'pickUp') {
      let chosen = asDate(suggestedDateTime);
      const dropOffDateObj = formData.dropOffDate ? new Date(formData.dropOffDate) : null;
      const minAllowedPickUp = dropOffDateObj ? new Date(dropOffDateObj.getTime() + 1 * 60 * 60 * 1000) : null;
      
      if (minAllowedPickUp && chosen.getTime() < minAllowedPickUp.getTime()) {
        chosen = minAllowedPickUp;
      }
      
      const formattedPickUp = formatDateTimeLocal(chosen);
      setFormData(prev => ({ ...prev, pickUpDate: formattedPickUp }));
      
      if (stationTimings && !stationTimings.is24Hours) {
        const pickUpValidation = getNearestAvailableTime(formattedPickUp, stationTimings);
        if (pickUpValidation.isValid) {
          setTimingAlert(null);
        }
      } else {
        setTimingAlert(null);
      }
      return;
    }

    if (timeType === 'dropOff') {
      const dropOffDateObj = asDate(suggestedDateTime);
      const formattedDropOff = formatDateTimeLocal(dropOffDateObj);
      const calculatedPickup = new Date(dropOffDateObj.getTime() + 3 * 60 * 60 * 1000);
      const minAllowedPickUp = new Date(dropOffDateObj.getTime() + 1 * 60 * 60 * 1000);
      
      let finalPickUpDateObj = calculatedPickup;
      
      if (stationTimings && !stationTimings.is24Hours) {
        const pickUpValidation = getNearestAvailableTime(calculatedPickup.toISOString(), stationTimings);
        if (!pickUpValidation.isValid && pickUpValidation.suggestions?.length > 0) {
          const suitable = pickUpValidation.suggestions.find((s) => {
            const sTs = new Date(s.dateTime).getTime();
            return sTs >= minAllowedPickUp.getTime();
          });
          if (suitable) {
            finalPickUpDateObj = new Date(suitable.dateTime);
          }
        }
      }
      
      const formattedPickUp = formatDateTimeLocal(finalPickUpDateObj);
      setFormData(prev => ({ ...prev, dropOffDate: formattedDropOff, pickUpDate: formattedPickUp }));
      setTimingAlert(null);
      return;
    }
  };

// ONLY REPLACE THE handlePaymentSuccess FUNCTION IN YOUR KEY FORM
// Find this function around line 195 and replace it with this:

const handlePaymentSuccess = async (paymentId) => {
  setIsLoading(true);
  setIsPaymentProcessing(true);
  
  try {
    console.log('💰 Payment successful! Payment ID:', paymentId);
    
    // Generate PIN after payment success
    const pin = generatePIN();
    console.log('🔐 PIN generated:', pin);
    setGeneratedPIN(pin);
    
    // Prepare payload matching API expectations EXACTLY
    const payload = {
      dropOffPerson: {
        name: formData.dropName,
        email: formData.dropEmail,
      },
      pickUpPerson: {
        name: formData.pickupName,
        email: formData.pickupEmail || null,
      },
      keyDetails: {
        numberOfKeys: parseInt(formData.numberOfKeys),
        keyTypes: formData.keyTypes,
        otherKeyType: formData.otherKeyType || null,
        description: formData.keyDescription || null,
        specialInstructions: formData.specialInstructions || null,
      },
      dropOffDate: formData.dropOffDate,
      pickUpDate: formData.pickUpDate,
      stationId: formData.stationId,
      keyCode: pin,
      paymentId: paymentId,
    };

    console.log('📤 Sending to API:', JSON.stringify(payload, null, 2));

    // Send booking data to backend
    const response = await fetch("/api/key-handover", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      throw new Error(errorData.message || `API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Booking created:', data);
    
    if (data.success) {
      setPaymentSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log('🎉 Success! Emails should be sent.');
    } else {
      throw new Error(data.message || "Booking failed");
    }
  } catch (error) {
    console.error("💥 Error:", error);
    alert(`Booking error: ${error.message}\n\nPlease contact support with payment ID: ${paymentId}`);
  } finally {
    setIsLoading(false);
    setIsPaymentProcessing(false);
  }
};

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updated = { ...formData };

    if (type === "checkbox") {
      if (name === "termsAccepted") {
        updated[name] = checked;
      } else if (name === "keyTypes") {
        // Handle key type checkboxes
        if (checked) {
          updated.keyTypes = [...updated.keyTypes, value];
        } else {
          updated.keyTypes = updated.keyTypes.filter(t => t !== value);
        }
      }
      setFormData(updated);
      return;
    }

    if (name === "dropOffDate") {
      const now = getRoundedNow();
      let chosen = new Date(value);
      if (chosen < now) chosen = new Date(now.getTime() + 10 * 60000);
      updated.dropOffDate = formatDateTimeLocal(chosen);
      const minPick = new Date(chosen.getTime() + 60 * 60000);
      updated.pickUpDate = formatDateTimeLocal(new Date(minPick.getTime() + 2 * 60 * 60000));
      setFormData(updated);
      return;
    }

    if (name === "pickUpDate") {
      const drop = new Date(updated.dropOffDate);
      const pick = new Date(value);
      if (pick <= drop) {
        const corrected = new Date(drop.getTime() + 60 * 60000);
        updated.pickUpDate = formatDateTimeLocal(corrected);
      } else {
        updated.pickUpDate = value;
      }
      setFormData(updated);
      return;
    }

    updated[name] = value;
    setFormData(updated);
  };

  useEffect(() => {
    let e = {};
    
    // Step 1 validations
    if (!formData.numberOfKeys) e.numberOfKeys = "Required";
    if (formData.keyTypes.length === 0) e.keyTypes = "Select at least one key type";
    if (formData.keyTypes.includes("other") && !formData.otherKeyType.trim()) {
      e.otherKeyType = "Please specify other key type";
    }
    if (!formData.dropName) e.dropName = "Required";
    if (!formData.dropEmail) e.dropEmail = "Required";
    if (!formData.pickupName) e.pickupName = "Required";
    if (formData.dropEmail && !EMAIL_REGEX.test(formData.dropEmail)) e.dropEmail = "Invalid email";
    if (formData.pickupEmail && !EMAIL_REGEX.test(formData.pickupEmail)) e.pickupEmail = "Invalid email";
    if (!formData.stationId) e.stationId = "Select station";
    
    // Step 2 validations
    if (!formData.dropOffDate) e.dropOffDate = "Required";
    if (!formData.pickUpDate) e.pickUpDate = "Required";
    if (timingAlert && timingAlert.length > 0) {
      e.timing = "Please adjust times to match station hours";
    }
    
    // Step 3 validations
    if (!formData.termsAccepted) e.termsAccepted = "Required";
    
    setErrors(e);
  }, [formData, timingAlert]);

  const canProceedStep1 = !errors.numberOfKeys && !errors.keyTypes && !errors.otherKeyType && 
                          !errors.dropName && !errors.pickupName && !errors.dropEmail && !errors.stationId;
  const canProceedStep2 = !errors.dropOffDate && !errors.pickUpDate && !hasTimingConflict;
  const canProceedStep3 = Object.keys(errors).length === 0;
  
  const selectedStation = stations.find(s => s._id === formData.stationId);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>🔑 Key Handover Service</h1>
          <p className={styles.heroSubtitle}>Secure storage and transfer for your keys - A$9.99/day</p>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.contentGrid}>
          <div className={styles.formSection}>
            <div className={styles.formCard}>
              <div className={styles.progressBar}>
                {["Key Details & People", "Schedule", "Review & Payment"].map((s, i) => (
                  <React.Fragment key={s}>
                    <div className={`${styles.step} ${currentStep >= i + 1 ? styles.active : ''}`}>
                      <div className={styles.stepCircle}>{i + 1}</div>
                      <span className={styles.stepLabel}>{s}</span>
                    </div>
                    {i < 2 && <div className={styles.stepLine} />}
                  </React.Fragment>
                ))}
              </div>

              {currentStep === 1 && (
                <div className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Key Details</h2>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>🔢</span>Number of Keys</label>
                    <select className={styles.select} name="numberOfKeys" value={formData.numberOfKeys} onChange={handleChange}>
                      {[...Array(10)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'key' : 'keys'}</option>
                      ))}
                    </select>
                    {errors.numberOfKeys && <span className={styles.errorText}>{errors.numberOfKeys}</span>}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>🔑</span>Key Type(s) - Select all that apply</label>
                    <div className={styles.checkboxGrid}>
                      {[
                        { value: "house", label: "🏠 House/Apartment" },
                        { value: "car", label: "🚗 Car Keys" },
                        { value: "office", label: "🏢 Office Keys" },
                        { value: "mailbox", label: "📬 Mailbox Keys" },
                        { value: "safe", label: "🔐 Safe Keys" },
                        { value: "other", label: "📦 Other" }
                      ].map(keyType => (
                        <label key={keyType.value} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            name="keyTypes"
                            value={keyType.value}
                            checked={formData.keyTypes.includes(keyType.value)}
                            onChange={handleChange}
                            className={styles.checkbox}
                          />
                          <span>{keyType.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.keyTypes && <span className={styles.errorText}>{errors.keyTypes}</span>}
                  </div>

                  {formData.keyTypes.includes("other") && (
                    <div className={styles.inputGroup}>
                      <label className={styles.label}><span className={styles.labelIcon}>✏️</span>Specify Other Key Type</label>
                      <input 
                        className={styles.input} 
                        placeholder="e.g., Storage unit, Gym locker" 
                        name="otherKeyType" 
                        value={formData.otherKeyType} 
                        onChange={handleChange} 
                      />
                      {errors.otherKeyType && <span className={styles.errorText}>{errors.otherKeyType}</span>}
                    </div>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>📝</span>Key Description (Optional)</label>
                    <textarea 
                      className={styles.textarea} 
                      placeholder="e.g., Silver Toyota key with red keychain, House key with number tag" 
                      name="keyDescription" 
                      value={formData.keyDescription} 
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>💡</span>Special Instructions (Optional)</label>
                    <textarea 
                      className={styles.textarea} 
                      placeholder="e.g., Handle with care - remote control attached, Keep keys together" 
                      name="specialInstructions" 
                      value={formData.specialInstructions} 
                      onChange={handleChange}
                      rows="2"
                    />
                  </div>

                  <h2 className={styles.sectionTitle} style={{marginTop: '2rem'}}>People & Station</h2>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>👤</span>Drop-off Person Name</label>
                    <input className={styles.input} placeholder="Enter full name" name="dropName" value={formData.dropName} onChange={handleChange} />
                    {errors.dropName && <span className={styles.errorText}>{errors.dropName}</span>}
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>📧</span>Drop-off Person Email</label>
                    <input className={styles.input} placeholder="email@example.com" name="dropEmail" type="email" value={formData.dropEmail} onChange={handleChange} />
                    {errors.dropEmail && <span className={styles.errorText}>{errors.dropEmail}</span>}
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>👤</span>Pick-up Person Name</label>
                    <input className={styles.input} placeholder="Enter full name" name="pickupName" value={formData.pickupName} onChange={handleChange} />
                    {errors.pickupName && <span className={styles.errorText}>{errors.pickupName}</span>}
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>📧</span>Pick-up Person Email (Optional)</label>
                    <input className={styles.input} placeholder="email@example.com" name="pickupEmail" type="email" value={formData.pickupEmail} onChange={handleChange} />
                    <small className={styles.helpText}>Picker will receive PIN and pickup details if email is provided</small>
                    {errors.pickupEmail && <span className={styles.errorText}>{errors.pickupEmail}</span>}
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>📍</span>Select Station</label>
                    <select className={styles.select} name="stationId" value={formData.stationId} onChange={handleChange} disabled={isLoadingStations}>
                      <option value="">{isLoadingStations ? 'Loading stations...' : 'Choose a station...'}</option>
                      {stations.map((s) => (<option key={s._id} value={s._id}>{s.name} – {s.location}</option>))}
                    </select>
                    {errors.stationId && <span className={styles.errorText}>{errors.stationId}</span>}
                  </div>
                  
                  <button className={styles.btnPrimary} onClick={() => canProceedStep1 && setCurrentStep(2)} disabled={!canProceedStep1}>Continue →</button>
                </div>
              )}

              {currentStep === 2 && (
                <div className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Schedule</h2>
                  {selectedStation && (
                    <div className={styles.selectedStation}>
                      <div className={styles.selectedStationTitle}>Selected Station:</div>
                      <div className={styles.selectedStationName}>{selectedStation.name}<span className={styles.selectedStationLocation}> – {selectedStation.location}</span></div>
                    </div>
                  )}
                  
                  {isCheckingTimings && (
                    <div className={styles.checkingTimings}>
                      Checking station hours…
                    </div>
                  )}

                  {timingAlert && timingAlert.length > 0 && (
                    <div className={styles.timingAlert}>
                      <div className={styles.alertHeader}>
                        <span className={styles.alertIcon}>⚠️</span>
                        <span className={styles.alertTitle}>Station Timing Advisory</span>
                      </div>

                      {timingAlert.map((alert, index) => (
                        <div key={index} className={styles.alertItem}>
                          <div className={styles.alertMessage}>
                            <strong>{alert.type === 'dropOff' ? '📥 Drop-off' : '📤 Pick-up'}:</strong> {alert.message}
                          </div>

                          {alert.details.openTime && alert.details.closeTime && (
                            <div className={styles.alertInfo}>
                              🕒 Station hours on {alert.details.dayName}: {alert.details.openTime} - {alert.details.closeTime}
                            </div>
                          )}

                          {alert.details.suggestions && alert.details.suggestions.length > 0 && (
                            <div className={styles.suggestions}>
                              <div className={styles.suggestionsTitle}>💡 Suggested alternatives:</div>

                              {alert.details.suggestions.map((suggestion, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => applySuggestedTime(alert.type, suggestion.dateTime)}
                                  className={styles.suggestionBtn}
                                >
                                  <div className={styles.suggestionLabel}>{suggestion.label}</div>
                                  <div className={styles.suggestionTime}>
                                    {formatDateTime(suggestion.dateTime)}
                                  </div>
                                  <div className={styles.suggestionAction}>Use this time →</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>📥</span>Drop-off Date & Time</label>
                    <input type="datetime-local" className={styles.input} name="dropOffDate" value={formData.dropOffDate} onChange={handleChange} min={getMinDateTime()} />
                    {errors.dropOffDate && <span className={styles.errorText}>{errors.dropOffDate}</span>}
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}><span className={styles.labelIcon}>📤</span>Pick-up Date & Time</label>
                    <input type="datetime-local" className={styles.input} name="pickUpDate" value={formData.pickUpDate} onChange={handleChange} />
                    {errors.pickUpDate && <span className={styles.errorText}>{errors.pickUpDate}</span>}
                  </div>
                  
                  <div className={styles.buttonRow}>
                    <button className={styles.btnSecondary} onClick={() => setCurrentStep(1)}>← Back</button>
                    <button className={styles.btnPrimary} onClick={() => canProceedStep2 && setCurrentStep(3)} disabled={!canProceedStep2}>Continue →</button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className={styles.stepContent}>
                  {paymentSuccess && generatedPIN ? (
                    // Show PIN after successful payment
                    <div className={styles.successContent}>
                      <h2 className={styles.sectionTitle}>🎉 Booking Confirmed!</h2>
                      
                      {/* PIN Display - PROMINENT */}
                      <div className={styles.pinDisplay}>
                        <div className={styles.pinHeader}>
                          <span className={styles.pinIcon}>🔐</span>
                          <h3 className={styles.pinTitle}>Your 6-Digit Pickup PIN</h3>
                        </div>
                        <div className={styles.pinCode}>{generatedPIN}</div>
                        <button 
                          type="button"
                          className={styles.pinCopyBtn} 
                          onClick={copyPINToClipboard}
                        >
                          {copiedPIN ? '✓ Copied!' : '📋 Copy PIN'}
                        </button>
                        <div className={styles.pinWarning}>
                          <span className={styles.warningIcon}>⚠️</span>
                          <div>
                            <strong>SAVE THIS PIN</strong> - Keys cannot be collected without it. 
                            This PIN has been sent to your email.
                          </div>
                        </div>
                      </div>

                      <div className={styles.emailNoticeBox}>
                        <div className={styles.emailNoticeIcon}>📧</div>
                        <div className={styles.emailNoticeContent}>
                          <strong>Confirmation emails sent to:</strong>
                          <ul>
                            <li>{formData.dropEmail} (Drop-off person)</li>
                            {formData.pickupEmail && <li>{formData.pickupEmail} (Pick-up person)</li>}
                          </ul>
                        </div>
                      </div>

                      <div className={styles.reviewCard}>
                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>Booking Details</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Booking Reference:</span>
                            <span className={styles.reviewValue}>KEY-{Date.now().toString().slice(-8)}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Station:</span>
                            <span className={styles.reviewValue}>{selectedStation?.name} – {selectedStation?.location}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Drop-off:</span>
                            <span className={styles.reviewValue}>{formData.dropOffDate ? formatDateTime(formData.dropOffDate) : 'N/A'}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Pick-up:</span>
                            <span className={styles.reviewValue}>{formData.pickUpDate ? formatDateTime(formData.pickUpDate) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        className={styles.btnPrimary}
                        onClick={() => window.location.href = '/'}
                      >
                        Return to Home
                      </button>
                    </div>
                  ) : (
                    // Show review and payment before PIN
                    <>
                      <h2 className={styles.sectionTitle}>Review & Payment</h2>
                      <div className={styles.reviewCard}>
                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>Key Details</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Number of Keys:</span>
                            <span className={styles.reviewValue}>{formData.numberOfKeys}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Key Type(s):</span>
                            <span className={styles.reviewValue}>
                              {formData.keyTypes.map(type => {
                                const typeLabels = {
                                  house: "House/Apartment",
                                  car: "Car Keys",
                                  office: "Office Keys",
                                  mailbox: "Mailbox Keys",
                                  safe: "Safe Keys",
                                  other: formData.otherKeyType || "Other"
                                };
                                return typeLabels[type];
                              }).join(", ")}
                            </span>
                          </div>
                          {formData.keyDescription && (
                            <div className={styles.reviewItem}>
                              <span className={styles.reviewLabel}>Description:</span>
                              <span className={styles.reviewValue}>{formData.keyDescription}</span>
                            </div>
                          )}
                          {formData.specialInstructions && (
                            <div className={styles.reviewItem}>
                              <span className={styles.reviewLabel}>Special Instructions:</span>
                              <span className={styles.reviewValue}>{formData.specialInstructions}</span>
                            </div>
                          )}
                        </div>

                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>People Details</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Drop-off Person:</span>
                            <span className={styles.reviewValue}>{formData.dropName}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Drop-off Email:</span>
                            <span className={styles.reviewValue}>{formData.dropEmail}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Pick-up Person:</span>
                            <span className={styles.reviewValue}>{formData.pickupName}</span>
                          </div>
                          {formData.pickupEmail && (
                            <div className={styles.reviewItem}>
                              <span className={styles.reviewLabel}>Pick-up Email:</span>
                              <span className={styles.reviewValue}>{formData.pickupEmail}</span>
                            </div>
                          )}
                        </div>

                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>Location & Schedule</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Station:</span>
                            <span className={styles.reviewValue}>{selectedStation?.name} – {selectedStation?.location}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Drop-off:</span>
                            <span className={styles.reviewValue}>{formData.dropOffDate ? formatDateTime(formData.dropOffDate) : 'N/A'}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Pick-up:</span>
                            <span className={styles.reviewValue}>{formData.pickUpDate ? formatDateTime(formData.pickUpDate) : 'N/A'}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Duration:</span>
                            <span className={styles.reviewValue}>{numberOfDays} day(s)</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            name="termsAccepted"
                            checked={formData.termsAccepted}
                            onChange={handleChange}
                          />
                          <span>
                            I agree to the{" "}
                            <button
                              type="button"
                              className={styles.legalBtn}
                              onClick={() => setShowTermsModal(true)}
                            >
                              Terms & Conditions
                            </button>
                          </span>
                        </label>
                        {errors.termsAccepted && (
                          <span className={styles.errorText}>{errors.termsAccepted}</span>
                        )}
                      </div>

                      {showTermsModal && (
                        <div className={styles.modalOverlay}>
                          <div className={styles.modalBox} role="dialog" aria-modal="true">
                            <button
                              className={styles.modalClose}
                              aria-label="Close terms modal"
                              onClick={() => setShowTermsModal(false)}
                            >
                              ✕
                            </button>

                            <h2 className={styles.modalTitle}>Before You Continue</h2>

                            <div className={styles.modalContent}>
                              <p>
                                By proceeding with this booking, you agree to Luggage Terminal&apos;s
                                <strong> Terms & Conditions</strong> and acknowledge our
                                <strong> Privacy Policy</strong>.
                              </p>

                              <p>
                                Please ensure your keys do not contain prohibited items. Your 6-digit PIN
                                is required for key collection. Refunds and cancellations are subject to 
                                our cancellation policy.
                              </p>

                              <div className={styles.modalActions}>
                                <a
                                  href="/terms-&-conditions"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.legalBtnSecondary}
                                >
                                  Terms & Conditions
                                </a>

                                <a
                                  href="/privacy-policy"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.legalBtnSecondary}
                                >
                                  Privacy Policy
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className={styles.emailNoticeBox}>
                        <div className={styles.emailNoticeIcon}>📧</div>
                        <div className={styles.emailNoticeContent}>
                          <strong>After Payment:</strong>
                          <div>A unique 6-digit PIN will be generated and sent to:</div>
                          <ul>
                            <li>{formData.dropEmail} (Drop-off person)</li>
                            {formData.pickupEmail && <li>{formData.pickupEmail} (Pick-up person)</li>}
                          </ul>
                        </div>
                      </div>

                      {isLoading || isPaymentProcessing ? (
                        <div className={styles.loadingContainer}>
                          <div className={styles.spinner}></div>
                          <p className={styles.loadingText}>
                            {isPaymentProcessing ? "Processing payment..." : "Processing your booking..."}
                          </p>
                          {isPaymentProcessing && (
                            <p className={styles.subtext}>Please don&apos;t close this window</p>
                          )}
                        </div>
                      ) : canProceedStep3 ? (
                        <div className={styles.paymentSection}>
                          <PayPalPayment
                            totalAmount={totalAmount}
                            onPaymentSuccess={handlePaymentSuccess}
                            formData={formData}
                            disabled={isLoading || isPaymentProcessing}
                            onProcessingChange={setIsPaymentProcessing}
                          />
                        </div>
                      ) : (
                        <div className={styles.warningBox}>
                          Please accept the terms and conditions to proceed with payment.
                        </div>
                      )}

                      <div className={styles.buttonRow}>
                        <button 
                          className={styles.btnSecondary} 
                          onClick={() => setCurrentStep(2)}
                          disabled={isLoading || isPaymentProcessing}
                        >
                          ← Back
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.sidebar}>
            <div className={styles.priceCard}>
              <button className={styles.toggleButton} onClick={() => setShowPriceSummary(!showPriceSummary)}>
                <div className={styles.toggleButtonContent}>
                  <span className={styles.totalLabel}>Total Amount</span>
                  <span className={styles.totalValue}>A${totalAmount.toFixed(2)}</span>
                </div>
                <div className={styles.toggleAction}>
                  <span className={styles.toggleText}>{showPriceSummary ? 'Hide' : 'Show'} Details</span>
                  <span className={styles.toggleIcon}>{showPriceSummary ? '▲' : '▼'}</span>
                </div>
              </button>
              
              <div className={`${styles.collapsibleContent} ${showPriceSummary ? styles.expanded : ''}`}>
                <div className={styles.priceBreakdown}>
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>Rate per day:</span>
                    <span className={styles.priceValue}>A${KEY_RATE_PER_DAY.toFixed(2)}</span>
                  </div>
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>Number of days:</span>
                    <span className={styles.priceValue}>{numberOfDays}</span>
                  </div>
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>Number of keys:</span>
                    <span className={styles.priceValue}>{formData.numberOfKeys}</span>
                  </div>
                  <div className={styles.priceDivider}></div>
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel} style={{fontWeight: '700', fontSize: '1.125rem'}}>Total:</span>
                    <span className={styles.priceValue} style={{fontSize: '1.5rem', fontWeight: '800'}}>A${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className={styles.priceFeatures}>
                  {/* <div className={styles.featureItem}>
                    <div className={styles.featureIcon}>✓</div>
                    <span>A$10K Insurance included</span>
                  </div> */}
                  <div className={styles.featureItem}>
                    <div className={styles.featureIcon}>✓</div>
                    <span>6-digit PIN security</span>
                  </div>
                  <div className={styles.featureItem}>
                    <div className={styles.featureIcon}>✓</div>
                    <span>Email notifications</span>
                  </div>
                  <div className={styles.featureItem}>
                    <div className={styles.featureIcon}>✓</div>
                    <span>Secure 24/7 storage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}