"use client";
import React, { useState, useEffect, useCallback } from "react";
import styles from "./Booking.module.css";
import Header from "@/components/Header";
import PayPalPayment from "../../components/LuggagePay.js";
import {
  getNearestAvailableTime,
  formatDateTime,
  formatDateTimeLocal
} from "@/utils/stationTimingValidator";

const LuggageBookingForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "+61 ",
    dropOffDate: "",
    pickUpDate: "",
    luggageCount: 1,
    luggageSize: "Small",
    specialInstructions: "",
    termsAccepted: false,
    stationId: "",
  });

  const [stations, setStations] = useState([]);
  const [stationTimings, setStationTimings] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [hasSpecialInstructions, setHasSpecialInstructions] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // Timing validation states
  const [timingAlert, setTimingAlert] = useState(null);
  const [isCheckingTimings, setIsCheckingTimings] = useState(false);

  // NEW: capacity states
  const [capacityStatus, setCapacityStatus] = useState(null);
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
  const [capacityError, setCapacityError] = useState(null);
  const [alternativeStations, setAlternativeStations] = useState([]);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const ratePerLuggagePerDay = 7.99;

  // ---- validateStationTimings (moved up so effects can call it) ----
  const validateStationTimings = useCallback(() => {
    if (!stationTimings) {
      console.log('⏭️ Skipping validation - no timings available');
      return;
    }

    console.log('🔍 ========== VALIDATION START ==========');
    console.log('📋 Current form data:', {
      dropOff: formData.dropOffDate,
      pickUp: formData.pickUpDate
    });
    console.log('🏢 Station timings:', stationTimings);

    setIsCheckingTimings(true);
    let alerts = [];

    // Check drop-off time
    if (formData.dropOffDate) {
      console.log('📥 Validating drop-off time:', formData.dropOffDate);
      const dropOffValidation = getNearestAvailableTime(formData.dropOffDate, stationTimings);
      console.log('📥 Drop-off result:', {
        isValid: dropOffValidation.isValid,
        reason: dropOffValidation.reason
      });

      if (!dropOffValidation.isValid) {
        alerts.push({
          type: 'dropOff',
          message: `Drop-off time falls when station is closed`,
          details: dropOffValidation,
          selectedTime: formData.dropOffDate
        });
      }
    }

    // Check pick-up time
    if (formData.pickUpDate) {
      console.log('📤 Validating pick-up time:', formData.pickUpDate);
      const pickUpValidation = getNearestAvailableTime(formData.pickUpDate, stationTimings);
      console.log('📤 Pick-up result:', {
        isValid: pickUpValidation.isValid,
        reason: pickUpValidation.reason
      });

      if (!pickUpValidation.isValid) {
        alerts.push({
          type: 'pickUp',
          message: `Pick-up time falls when station is closed`,
          details: pickUpValidation,
          selectedTime: formData.pickUpDate
        });
      }
    }

    console.log('🚨 Total alerts generated:', alerts.length);
    console.log('🔍 ========== VALIDATION END ==========');

    setTimingAlert(alerts.length > 0 ? alerts : null);
    setIsCheckingTimings(false);
  }, [formData.dropOffDate, formData.pickUpDate, stationTimings]);

  // Theme detection
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');

    if (!currentTheme) {
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
      root.setAttribute('data-theme', theme);
    }
  }, []);

  // Auto-fill user data if logged in
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("email");
    if (storedUsername && storedEmail) {
      setFormData((prev) => ({
        ...prev,
        fullName: storedUsername,
        email: storedEmail,
      }));
      setIsUserLoggedIn(true);
    }
  }, []);

  // Fetch available stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/station/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setStations(data.stations);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      }
    };
    fetchStations();
  }, []);

  // Fetch station timings when station is selected
  useEffect(() => {
    const fetchStationTimings = async () => {
      if (!formData.stationId) {
        setStationTimings(null);
        return;
      }

      console.log('🏢 Fetching timings for station:', formData.stationId);

      try {
        const response = await fetch(`/api/station/${formData.stationId}/timings`);
        if (!response.ok) {
          console.warn(`⚠️ Station timings API returned ${response.status}. Using default 24/7 mode.`);
          setStationTimings({ is24Hours: true });
          return;
        }
        const data = await response.json();
        console.log('✅ Station timings received:', data);

        if (data.success && data.timings) {
          setStationTimings(data.timings);
        } else {
          console.warn("⚠️ No timings data received. Using default 24/7 mode.");
          setStationTimings({ is24Hours: true });
        }
      } catch (error) {
        console.error("❌ Failed to fetch station timings:", error);
        setStationTimings({ is24Hours: true });
      }
    };

    fetchStationTimings();
  }, [formData.stationId]);

  // Validate timing whenever dropOffDate or pickUpDate changes
  useEffect(() => {
    if (formData.stationId && stationTimings && (formData.dropOffDate || formData.pickUpDate)) {
      console.log('🔄 Times changed, validating...');
      validateStationTimings();
    }
  }, [formData.stationId, stationTimings, validateStationTimings]);

  // --------------------
  // Capacity: check function
  // --------------------
  const checkStationCapacity = async () => {
    if (!formData.stationId || !formData.dropOffDate || !formData.pickUpDate || !formData.luggageCount) {
      return;
    }

    setIsCheckingCapacity(true);
    setCapacityError(null);

    try {
      console.log('🔍 Checking station capacity...');

      const response = await fetch('/api/station/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: formData.stationId,
          dropOffDate: formData.dropOffDate,
          pickUpDate: formData.pickUpDate,
          luggageCount: formData.luggageCount
        })
      });

      const data = await response.json();

      if (response.ok && data) {
        setCapacityStatus(data);
        console.log('📊 Capacity status:', data);

        // If not available, fetch alternatives
        if (!data.available) {
          await fetchAlternativeStations();
        } else {
          setShowAlternatives(false);
          setAlternativeStations([]);
        }
      } else {
        console.warn('Capacity API returned non-ok or empty response', data);
        setCapacityError("We couldn’t check station availability right now. Please try again in a moment.");
      }
    } catch (error) {
      console.error('Capacity check failed:', error);
      setCapacityError("We couldn’t check station availability right now. Please try again in a moment.");
    } finally {
      setIsCheckingCapacity(false);
    }
  };

  const fetchAlternativeStations = async () => {
    try {
      console.log('🔍 Fetching alternative stations...');

      // Get current station coordinates
      const currentStation = stations.find(s => s._id === formData.stationId);
      if (!currentStation?.coordinates) {
        console.warn('No coordinates for current station');
        return;
      }

      const coords = currentStation.coordinates.coordinates || currentStation.coordinates;
      const [longitude, latitude] = coords;

      const response = await fetch('/api/station/alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStationId: formData.stationId,
          latitude,
          longitude,
          dropOffDate: formData.dropOffDate,
          pickUpDate: formData.pickUpDate,
          luggageCount: formData.luggageCount
        })
      });

      const data = await response.json();

      if (data.success && data.alternatives && data.alternatives.length > 0) {
        setAlternativeStations(data.alternatives);
        setShowAlternatives(true);
        console.log('✅ Found alternatives:', data.alternatives.length);
      } else {
        setAlternativeStations([]);
        setShowAlternatives(false);
        console.log('❌ No alternatives found');
      }
    } catch (error) {
      console.error('Failed to fetch alternatives:', error);
    }
  };

  // Debounced capacity check when relevant form fields change
  useEffect(() => {
    if (formData.stationId && formData.dropOffDate && formData.pickUpDate && formData.luggageCount) {
      const debounceTimer = setTimeout(() => {
        checkStationCapacity();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [formData.stationId, formData.dropOffDate, formData.pickUpDate, formData.luggageCount]);

  // Function to select an alternative station
  const selectAlternativeStation = (alternativeStation) => {
    console.log('🔄 Switching to alternative station:', alternativeStation.name);

    setFormData(prev => ({
      ...prev,
      stationId: alternativeStation._id
    }));

    setShowAlternatives(false);
    setAlternativeStations([]);
    setCapacityStatus(null);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Apply suggested time - improved handling:
  // - when applying a dropOff suggestion we set dropOff AND compute pickUp = dropOff + 4hrs
  // - we then validate that pickUp immediately and only show a pickUp alert if there truly are no valid pick-up options
  const applySuggestedTime = (timeType, suggestedDateTime) => {
    console.log('🎯 ========== APPLYING SUGGESTION ==========');
    console.log('🎯 Type:', timeType);
    console.log('🎯 Suggested time:', suggestedDateTime);

    const asDate = (d) => (d instanceof Date ? d : new Date(d));

    const getMinAllowedPickUp = (dropOffDt) => {
      return dropOffDt ? new Date(dropOffDt.getTime() + 1 * 60 * 60 * 1000) : null;
    };

    // PICK-UP suggestion clicked -> ensure >= dropOff +1hr and set it
    if (timeType === 'pickUp') {
      let chosen = asDate(suggestedDateTime);

      const dropOffDateObj = formData.dropOffDate ? new Date(formData.dropOffDate) : null;
      const minAllowedPickUp = getMinAllowedPickUp(dropOffDateObj);

      if (minAllowedPickUp && chosen.getTime() < minAllowedPickUp.getTime()) {
        console.log('⚠️ Suggested pick-up is too close to drop-off. Bumping to dropOff + 1 hour.');
        chosen = minAllowedPickUp;
      }

      const formattedPickUp = formatDateTimeLocal(chosen);
      console.log('📤 Setting pick-up (ENFORCED >= dropOff+1hr):', formattedPickUp);

      setFormData(prev => ({ ...prev, pickUpDate: formattedPickUp }));
      // Immediately re-validate (the effect will also run later)
      if (stationTimings) {
        const pickUpValidation = getNearestAvailableTime(formattedPickUp, stationTimings);
        if (pickUpValidation.isValid) setTimingAlert(null);
        else setTimingAlert([{
          type: 'pickUp',
          message: 'Pick-up time falls when station is closed',
          details: pickUpValidation,
          selectedTime: formattedPickUp
        }]);
      } else {
        setTimingAlert(null);
      }
      console.log('🎯 ========== SUGGESTION APPLIED ==========');
      return;
    }

    // DROP-OFF suggestion clicked -> set dropOff, compute +4h pickUp, validate and pick best option
    if (timeType === 'dropOff') {
      const dropOffDateObj = asDate(suggestedDateTime);
      const formattedDropOff = formatDateTimeLocal(dropOffDateObj);
      console.log('📥 Setting drop-off to suggested:', formattedDropOff);

      // Calculate +4 hours pickUp (default behaviour)
      const calculatedPickup = new Date(dropOffDateObj.getTime() + 3 * 60 * 60 * 1000);
      const minAllowedPickUp = getMinAllowedPickUp(dropOffDateObj);
      if (minAllowedPickUp && calculatedPickup.getTime() < minAllowedPickUp.getTime()) {
        calculatedPickup.setTime(minAllowedPickUp.getTime());
      }

      // We'll decide finalPickUpDateObj and the timingAlert state here (don't rely on effect timing)
      let finalPickUpDateObj = calculatedPickup;
      let finalTimingAlert = null;

      if (stationTimings) {
        const pickUpValidation = getNearestAvailableTime(calculatedPickup.toISOString(), stationTimings);
        console.log('🔎 pickUpValidation for calculated +4h:', pickUpValidation);

        if (pickUpValidation.isValid) {
          // +4h is valid — no alert
          finalPickUpDateObj = calculatedPickup;
          finalTimingAlert = null;
          console.log('✅ Calculated +4h pick-up is within open hours; no pick-up alert.');
        } else {
          // Try to find a suggestion >= dropOff + 1hr
          const allSuggestions = pickUpValidation.suggestions || [];
          const dropMinTs = minAllowedPickUp ? minAllowedPickUp.getTime() : null;

          const suitable = allSuggestions.find((s) => {
            const sTs = new Date(s.dateTime).getTime();
            return dropMinTs ? sTs >= dropMinTs : true;
          });

          if (suitable) {
            finalPickUpDateObj = new Date(suitable.dateTime);
            finalTimingAlert = null; // we applied a valid suggestion so no alert
            console.log('✅ Found suitable suggestion for pick-up >= drop+1hr:', suitable.dateTime);
          } else if (allSuggestions.length > 0) {
            // Earliest suggestion exists but may be < drop+1h — bump it if needed; still treat as a suggestion
            const earliest = new Date(allSuggestions[0].dateTime);
            if (dropMinTs && earliest.getTime() < dropMinTs) {
              // Bump to drop+1hr
              finalPickUpDateObj = minAllowedPickUp || earliest;
              console.log('⚠️ Earliest suggestion earlier than drop+1hr; bumping to drop+1hr.');
            } else {
              finalPickUpDateObj = earliest;
            }
            finalTimingAlert = {
              type: 'pickUp',
              message: 'Pick-up time adjusted based on station hours',
              details: pickUpValidation,
              selectedTime: finalPickUpDateObj.toISOString(),
            };
            // We allow showing a helpful suggestion alert (not the "no suggestions" message)
            console.log('ℹ️ Using earliest suggestion for pick-up:', finalPickUpDateObj.toISOString());
          } else {
            // No suggestions at all — fallback to dropOff + 1 hour but show a pickUp alert so user can adjust if needed
            finalPickUpDateObj = minAllowedPickUp || calculatedPickup;
            finalTimingAlert = {
              type: 'pickUp',
              message: 'No pick-up slots found; please choose a different drop-off or pick-up time',
              details: pickUpValidation,
              selectedTime: finalPickUpDateObj.toISOString(),
            };
            console.log('⚠️ No suggestions returned for pick-up; falling back to dropOff + 1 hour and showing alert.');
          }
        }
      } else {
        // No stationTimings -> assume OK
        finalPickUpDateObj = calculatedPickup;
        finalTimingAlert = null;
      }

      const formattedPickUp = formatDateTimeLocal(finalPickUpDateObj);
      console.log('📤 Final pick-up chosen after validation:', formattedPickUp);

      // apply both drop-off and pick-up together AND update timing alert accordingly
      setFormData(prev => ({ ...prev, dropOffDate: formattedDropOff, pickUpDate: formattedPickUp }));
      setTimingAlert(finalTimingAlert ? [finalTimingAlert] : null);

      console.log('🎯 ========== SUGGESTION APPLIED ==========');
      return;
    }

    console.log('🎯 ========== SUGGESTION APPLIED (no-op) ==========');
  };

  // Calculate storage duration
  const calculateNumberOfDays = () => {
    if (!formData.dropOffDate || !formData.pickUpDate) return 1;
    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(formData.pickUpDate);
    const differenceInMs = pickUp - dropOff;
    return Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
  };

  const numberOfDays = calculateNumberOfDays();
  const totalAmount = formData.luggageCount * numberOfDays * ratePerLuggagePerDay;

  // Handle form field changes - WITH normal +4 hour logic
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    console.log('📝 Form field changed:', { name, value });

    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    // Auto-calculate pickup time when drop-off is selected
    if (name === "dropOffDate" && value) {
      console.log('📥 ========== DROP-OFF CHANGED ==========');

      // Initialize drop-off if first time
      if (!formData.dropOffDate) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        const localISOTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        updatedFormData.dropOffDate = `${value.slice(0, 10)}T${localISOTime.split("T")[1]}`;
      }

      console.log('📥 Drop-off set to:', updatedFormData.dropOffDate);

      // ALWAYS calculate pickup as +4 hours (normal behavior)
      const dropOffTime = new Date(updatedFormData.dropOffDate || value);
      const calculatedPickup = new Date(dropOffTime);
      calculatedPickup.setHours(calculatedPickup.getHours() + 3);

      const localPickUpISO = new Date(calculatedPickup.getTime() - calculatedPickup.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      console.log('📤 Auto-calculated pickup (+4hrs):', localPickUpISO);
      updatedFormData.pickUpDate = localPickUpISO;

      console.log('📥 ========== DROP-OFF PROCESSING DONE ==========');
    }

    setFormData(updatedFormData);
  };

  // Validate form
  useEffect(() => {
    const errorsObj = {};
    if (!formData.fullName) errorsObj.fullName = "Full Name is required";
    if (!formData.email) errorsObj.email = "Email is required";
    if (!formData.phone) errorsObj.phone = "Phone is required";
    if (!formData.dropOffDate) errorsObj.dropOffDate = "Drop-off Date is required";
    if (!formData.pickUpDate) errorsObj.pickUpDate = "Pick-up Date is required";
    if (!formData.termsAccepted) errorsObj.termsAccepted = "You must agree to the terms";
    if (!formData.stationId) errorsObj.stationId = "Please select a station";

    if (formData.dropOffDate && formData.pickUpDate) {
      const dropOff = new Date(formData.dropOffDate);
      const pickUp = new Date(formData.pickUpDate);
      const timeDifferenceInHours = (pickUp - dropOff) / (1000 * 60 * 60);
      if (timeDifferenceInHours < 1) {
        errorsObj.pickUpDate = "Pick-up time must be at least 1 hour after drop-off time.";
      }
    }

    // Prevent form submission if timings are invalid
    if (timingAlert && timingAlert.length > 0) {
      errorsObj.timing = "Please select valid station operating hours";
    }

    // Prevent form submission if capacity exceeded
    if (capacityStatus && !capacityStatus.available) {
      errorsObj.capacity = "Station is at capacity. Please select an alternative.";
    }

    setErrors(errorsObj);
    setIsFormValid(Object.keys(errorsObj).length === 0);
  }, [formData, timingAlert, capacityStatus]);

  // Handle successful payment
  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, paymentId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send booking details.");
      }
      const data = await response.json();
      if (data.success) window.location.href = "/Booked";
      else alert("❌ Failed to send booking email.");
    } catch (error) {
      console.error("Error:", error);
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const luggageSizes = [
    { value: "Small", label: "Small", icon: "🎒", desc: "Backpack, small bag" },
    { value: "Medium", label: "Medium", icon: "💼", desc: "Carry-on, briefcase" },
    { value: "Large", label: "Large", icon: "🧳", desc: "Standard suitcase" },
    { value: "Extra Large", label: "Extra Large", icon: "📦", desc: "Oversized luggage" },
  ];

    // find the currently selected station (used in Step 2 & review)
    const selectedStation = stations.find((s) => s._id === formData.stationId) || null;


  return (
    <>
      <Header />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Hero Section */}
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Store Your Luggage</h1>
              <p className={styles.heroSubtitle}>
                Secure, convenient storage at your chosen station
              </p>
            </div>
          </div>

          <div className={styles.contentGrid}>
            {/* Main Form */}
            <div className={styles.formSection}>
              <div className={styles.formCard}>
                {/* Progress Steps */}
                <div className={styles.progressBar}>
                  <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>1</div>
                    <span className={styles.stepLabel}>Details</span>
                  </div>
                  <div className={styles.stepLine}></div>
                  <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>2</div>
                    <span className={styles.stepLabel}>Luggage</span>
                  </div>
                  <div className={styles.stepLine}></div>
                  <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>3</div>
                    <span className={styles.stepLabel}>Payment</span>
                  </div>
                </div>

                <form onSubmit={(e) => e.preventDefault()}>
                  {/* Step 1: Personal Information */}
                  {currentStep === 1 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Personal Information</h2>

                      <div className={styles.inputGroup}>
                        <label htmlFor="fullName" className={styles.label}>
                          <span className={styles.labelIcon}>👤</span>
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          disabled={isUserLoggedIn}
                          className={styles.input}
                          placeholder="John Doe"
                        />
                        {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                      </div>

                      <div className={styles.inputRow}>
                        <div className={styles.inputGroup}>
                          <label htmlFor="email" className={styles.label}>
                            <span className={styles.labelIcon}>✉️</span>
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={isUserLoggedIn}
                            className={styles.input}
                            placeholder="john@example.com"
                          />
                          {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                        </div>

                        <div className={styles.inputGroup}>
                          <label htmlFor="phone" className={styles.label}>
                            <span className={styles.labelIcon}>📞</span>
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="+61 4xx xxx xxx"
                          />
                          {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="stationId" className={styles.label}>
                          <span className={styles.labelIcon}>📍</span>
                          Storage Station
                        </label>
                        <select
                          id="stationId"
                          name="stationId"
                          value={formData.stationId}
                          onChange={handleChange}
                          className={styles.select}
                        >
                          <option value="">Select a station</option>
                          {stations.map((station) => (
                            <option key={station._id} value={station._id}>
                              {station.name} - {station.location}
                            </option>
                          ))}
                        </select>
                        {errors.stationId && <span className={styles.errorText}>{errors.stationId}</span>}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className={styles.btnPrimary}
                        disabled={!formData.fullName || !formData.email || !formData.phone || !formData.stationId}
                      >
                        Continue to Luggage Details →
                      </button>
                    </div>
                  )}

                  {/* Step 2: Luggage & Schedule */}
                  {currentStep === 2 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Luggage & Schedule</h2>

                      {/* Selected station summary (Step 2) */}
<div className={styles.selectedStation}>
  <strong className={styles.selectedStationTitle}>Selected Station</strong>
  {selectedStation ? (
    <div className={styles.selectedStationName}>
      {selectedStation.name}
      {selectedStation.location ? <span className={styles.selectedStationLocation}> — {selectedStation.location}</span> : null}
    </div>
  ) : (
    <div className={styles.selectedStationEmpty}>No station selected. Go back to Details to pick one.</div>
  )}
</div>


                    <div className={styles.inputGroup}>
                        <label className={styles.label}>
                          <span className={styles.labelIcon}>🧳</span>
                          Luggage Size
                        </label>
                        <div className={styles.sizeGrid}>
                          {luggageSizes.map((size) => (
                            <label
                              key={size.value}
                              className={`${styles.sizeCard} ${
                                formData.luggageSize === size.value ? styles.selected : ""
                              }`}
                            >
                              <input
                                type="radio"
                                name="luggageSize"
                                value={size.value}
                                checked={formData.luggageSize === size.value}
                                onChange={handleChange}
                                className={styles.radioInput}
                              />
                              <div className={styles.sizeIcon}>{size.icon}</div>
                              <div className={styles.sizeName}>{size.label}</div>
                              <div className={styles.sizeDesc}>{size.desc}</div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label htmlFor="luggageCount" className={styles.label}>
                          <span className={styles.labelIcon}>🎒</span>
                          Number of Bags
                        </label>
                        <div className={styles.counterWrapper}>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                luggageCount: Math.max(1, prev.luggageCount - 1),
                              }))
                            }
                            className={styles.counterBtn}
                          >
                            −
                          </button>
                          <span className={styles.counterValue}>{formData.luggageCount}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                luggageCount: Math.min(10, prev.luggageCount + 1),
                              }))
                            }
                            className={styles.counterBtn}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Capacity API errors */}
                      {capacityError && (
                        <div className={styles.capacityApiError} role="alert" aria-live="polite">
                            ⚠️ {capacityError}
                        </div>
                      )}

                      {/* Capacity Status Display */}
                      {formData.stationId && capacityStatus && (
                        <div className={`${styles.capacityCard} ${!capacityStatus.available ? styles.capacityFull : ''}`}>
                          <div className={styles.capacityHeader}>
                            <span className={styles.capacityIcon}>{capacityStatus.status?.icon || '📊'}</span>
                            <span className={styles.capacityLabel}>{capacityStatus.status?.label || (capacityStatus.available ? 'Available' : 'Full')}</span>
                            <span className={styles.capacityPercentage}>{capacityStatus.capacity?.percentage ?? 0}%</span>
                          </div>
                          <div className={styles.capacityBar}>
                            <div
                              className={styles.capacityFill}
                              style={{
                                width: `${capacityStatus.capacity?.percentage ?? 0}%`,
                                backgroundColor: capacityStatus.status?.color || (capacityStatus.capacity?.percentage < 90 ? '#16a34a' : '#f97316')
                              }}
                            />
                          </div>
                          <p className={styles.capacityDescription}>
                            {capacityStatus.capacity?.current ?? 0} of {capacityStatus.capacity?.max ?? 0} bags booked for this time period
                          </p>

                          {!capacityStatus.available && (
                            <div className={styles.capacityError}>
                              <strong>⛔ Station at capacity!</strong> Unable to accept {formData.luggageCount} more bag(s).
                              {showAlternatives && alternativeStations.length > 0 && (
                                <span> Please select an alternative station below.</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Alternative Stations Display */}
                      {showAlternatives && alternativeStations.length > 0 && (
                        <div className={styles.alternativesSection}>
                          <h3 className={styles.alternativesTitle}>
                            📍 Alternative Stations Nearby
                          </h3>
                          <p className={styles.alternativesSubtitle}>
                            These stations have available capacity for your selected dates:
                          </p>

                          <div className={styles.alternativesGrid}>
                            {alternativeStations.map((alt) => (
                              <div key={alt._id} className={styles.alternativeCard}>
                                <div className={styles.alternativeHeader}>
                                  <h4 className={styles.alternativeName}>{alt.name}</h4>
                                  <span className={styles.alternativeDistance}>{alt.distance} km away</span>
                                </div>
                                <p className={styles.alternativeLocation}>{alt.location}</p>

                                <div className={styles.alternativeCapacity}>
                                  <div className={styles.capacityMini}>
                                    <div className={styles.capacityMiniBar}>
                                      <div
                                        className={styles.capacityMiniFill}
                                        style={{
                                          width: `${alt.capacity.percentage}%`,
                                          backgroundColor: alt.capacity.percentage < 60 ? '#16a34a' : '#f59e0b'
                                        }}
                                      />
                                    </div>
                                    <span className={styles.capacityMiniText}>
                                      {alt.capacity.current}/{alt.capacity.max} bags ({alt.capacity.percentage}%)
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => selectAlternativeStation(alt)}
                                  className={styles.selectAlternativeBtn}
                                >
                                  Select This Station →
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      

                      {/* Small checking indicator so isCheckingTimings/isCheckingCapacity are used */}
                      {(isCheckingTimings || isCheckingCapacity) && (
                        <div className={styles.checkingTimings}>
                          Checking station hours and capacity…
                        </div>
                      )}

                      {/* Timing Alert */}
                      {timingAlert && timingAlert.length > 0 && (
                        <div className={styles.timingAlert}>
                          <div className={styles.alertHeader}>
                            <span className={styles.alertIcon}>⚠️</span>
                            <span className={styles.alertTitle}>Station Timing Issue</span>
                          </div>

                          {timingAlert.map((alert, index) => (
                            <div key={index} className={styles.alertItem}>
                              <div className={styles.alertMessage}>
                                <strong>{alert.type === 'dropOff' ? '📥 Drop-off' : '📤 Pick-up'}:</strong> {alert.message}
                              </div>

                              {alert.details.openTime && alert.details.closeTime && (
                                <div className={styles.alertInfo}>
                                  Station hours on {alert.details.dayName}: {alert.details.openTime} - {alert.details.closeTime}
                                </div>
                              )}

                              {alert.details.suggestions && alert.details.suggestions.length > 0 && (
                                <div className={styles.suggestions}>
                                  <div className={styles.suggestionsTitle}>💡 Suggested alternatives:</div>

                                  {(() => {
                                    // compute minimum allowed pick-up (dropOff + 1 hour) if dropOff exists
                                    const dropOffDateObj = formData.dropOffDate ? new Date(formData.dropOffDate) : null;
                                    const minAllowedPickUpTs = dropOffDateObj ? dropOffDateObj.getTime() + 1 * 60 * 60 * 1000 : null;

                                    // filter suggestions:
                                    const filtered = alert.details.suggestions.filter((suggestion) => {
                                      // if this is a pickUp alert, only keep suggestions >= dropOff + 1hr
                                      if (alert.type === 'pickUp' && minAllowedPickUpTs) {
                                        const sugTs = new Date(suggestion.dateTime).getTime();
                                        return sugTs >= minAllowedPickUpTs;
                                      }
                                      // for dropOff (or if no dropOff chosen), keep all suggestions
                                      return true;
                                    });

                                    // If none survive the filter, optionally show a fallback message
                                    if (filtered.length === 0) {
                                      return (
                                        <div className={styles.noSuggestions}>
                                          No suitable pick-up suggestions available that are at least 1 hour after your drop-off. Please choose a different drop-off time or manually select a pick-up time.
                                        </div>
                                      );
                                    }

                                    return filtered.map((suggestion, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          console.log('🖱️ User clicked suggestion:', {
                                            alertType: alert.type,
                                            suggestionType: suggestion.type,
                                            dateTime: suggestion.dateTime
                                          });
                                          applySuggestedTime(alert.type, suggestion.dateTime);
                                        }}
                                        className={styles.suggestionBtn}
                                      >
                                        <div className={styles.suggestionLabel}>{suggestion.label}</div>
                                        <div className={styles.suggestionTime}>
                                          {formatDateTime(suggestion.dateTime)}
                                        </div>
                                        <div className={styles.suggestionAction}>Use this time →</div>
                                      </button>
                                    ));
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={styles.inputRow}>
                        <div className={styles.inputGroup}>
                          <label htmlFor="dropOffDate" className={styles.label}>
                            <span className={styles.labelIcon}>📥</span>
                            Drop-off Time
                          </label>
                          <input
                            type="datetime-local"
                            id="dropOffDate"
                            name="dropOffDate"
                            value={formData.dropOffDate}
                            onChange={handleChange}
                            className={styles.input}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                          {errors.dropOffDate && <span className={styles.errorText}>{errors.dropOffDate}</span>}
                        </div>

                        <div className={styles.inputGroup}>
                          <label htmlFor="pickUpDate" className={styles.label}>
                            <span className={styles.labelIcon}>📤</span>
                            Pick-up Time
                          </label>
                          <input
                            type="datetime-local"
                            id="pickUpDate"
                            name="pickUpDate"
                            value={formData.pickUpDate}
                            onChange={handleChange}
                            className={styles.input}
                            min={
                              formData.dropOffDate
                                ? new Date(new Date(formData.dropOffDate).getTime() + 3 * 60 * 60 * 1000)
                                    .toISOString()
                                    .slice(0, 16)
                                : new Date().toISOString().slice(0, 16)
                            }
                          />
                          {errors.pickUpDate && <span className={styles.errorText}>{errors.pickUpDate}</span>}
                        </div>
                      </div>

                      <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={hasSpecialInstructions}
                            onChange={(e) => setHasSpecialInstructions(e.target.checked)}
                            className={styles.checkbox}
                          />
                          <span>Add special instructions</span>
                        </label>
                      </div>

                      {hasSpecialInstructions && (
                        <div className={styles.inputGroup}>
                          <label htmlFor="specialInstructions" className={styles.label}>
                            <span className={styles.labelIcon}>📝</span>
                            Special Instructions
                          </label>
                          <select
                            id="specialInstructions"
                            name="specialInstructions"
                            value={formData.specialInstructions}
                            onChange={handleChange}
                            className={styles.select}
                          >
                            <option value="">Select an option</option>
                            <option value="Fragile items">Fragile items</option>
                            <option value="Oversized luggage">Oversized luggage</option>
                            <option value="Specific delivery time">Specific delivery time</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      )}

                      <div className={styles.buttonRow}>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className={styles.btnSecondary}
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className={styles.btnPrimary}
                          disabled={
                            !formData.dropOffDate ||
                            !formData.pickUpDate ||
                            (timingAlert && timingAlert.length > 0) ||
                            (capacityStatus && !capacityStatus.available)
                          }
                        >
                          Continue to Payment →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review & Payment */}
                  {currentStep === 3 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Review & Payment</h2>

                      <div className={styles.reviewCard}>
                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>Booking Details</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Name:</span>
                            <span className={styles.reviewValue}>{formData.fullName}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Email:</span>
                            <span className={styles.reviewValue}>{formData.email}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Phone:</span>
                            <span className={styles.reviewValue}>{formData.phone}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Station:</span>
                            <span className={styles.reviewValue}>
                              {stations.find((s) => s._id === formData.stationId)?.name || "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>Luggage Information</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Size:</span>
                            <span className={styles.reviewValue}>{formData.luggageSize}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Quantity:</span>
                            <span className={styles.reviewValue}>{formData.luggageCount} bag(s)</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Drop-off:</span>
                            <span className={styles.reviewValue}>
                              {new Date(formData.dropOffDate).toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Pick-up:</span>
                            <span className={styles.reviewValue}>
                              {new Date(formData.pickUpDate).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            name="termsAccepted"
                            checked={formData.termsAccepted}
                            onChange={handleChange}
                            className={styles.checkbox}
                          />
                          <span>I agree to the terms and conditions</span>
                        </label>
                        {errors.termsAccepted && <span className={styles.errorText}>{errors.termsAccepted}</span>}
                      </div>

                      {isLoading ? (
                        <div className={styles.loadingContainer}>
                          <div className={styles.spinner}></div>
                          <p className={styles.loadingText}>Processing your booking...</p>
                        </div>
                      ) : isFormValid ? (
                        <div className={styles.paymentSection}>
                          <PayPalPayment
                            totalAmount={totalAmount}
                            onPaymentSuccess={handlePaymentSuccess}
                            formData={formData}
                            disabled={isLoading}
                          />
                        </div>
                      ) : (
                        <div className={styles.warningBox}>
                          Please complete all required fields and accept the terms to proceed.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className={styles.btnSecondary}
                        disabled={isLoading}
                      >
                        ← Back to Luggage Details
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Pricing Sidebar */}
            <div className={styles.sidebar}>
              <div className={styles.priceCard}>
                <h3 className={styles.priceTitle}>Booking Summary</h3>

                <div className={`${styles.collapsibleContent} ${isSummaryExpanded ? styles.expanded : ''}`}>
                  <div className={styles.priceBreakdown}>
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Rate per bag/day</span>
                      <span className={styles.priceValue}>A${ratePerLuggagePerDay.toFixed(2)}</span>
                    </div>
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Number of bags</span>
                      <span className={styles.priceValue}>×{formData.luggageCount}</span>
                    </div>
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Storage duration</span>
                      <span className={styles.priceValue}>{numberOfDays} day(s)</span>
                    </div>
                  </div>

                  <div className={styles.priceFeatures}>
                    <div className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>24/7 Security</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>Insurance Included</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>Easy Access</span>
                    </div>
                    <div className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>Flexible Scheduling</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className={styles.toggleButton}
                >
                  <div className={styles.toggleButtonContent}>
                    <span className={styles.totalLabel}>Total Amount</span>
                    <span className={styles.totalValue}>A${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className={styles.toggleAction}>
                    {isSummaryExpanded ? (
                      <>
                        <span className={styles.toggleText}>View Less</span>
                        <span className={styles.toggleIcon}>▼</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.toggleText}>View Details</span>
                        <span className={styles.toggleIcon}>▲</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LuggageBookingForm;
