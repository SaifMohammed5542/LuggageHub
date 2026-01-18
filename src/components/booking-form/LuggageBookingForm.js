// components/booking-form/LuggageBookingForm.js - COMPLETE FIXED VERSION
"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styles from "./Booking.module.css";
import Header from "@/components/Header";
import PayPalPayment from "../LuggagePay";
import VisualDateTimePicker from "../DateTimePicker/VisualDateTimePicker";
// import { formatDateTimeLocal, getNearestAvailableTime } from "@/utils/stationTimingValidator";

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUNTRY_CODES = [
  { code: "+61", label: "🇦🇺 AUS (+61)" },
  { code: "+1", label: "🇺🇸 USA/CAN (+1)" },
  { code: "+44", label: "🇬🇧 UK (+44)" },
  { code: "+91", label: "🇮🇳 IND (+91)" },
  { code: "+86", label: "🇨🇳 CHN (+86)" },
  { code: "+81", label: "🇯🇵 JPN (+81)" },
  { code: "+33", label: "🇫🇷 FRA (+33)" },
  { code: "+49", label: "🇩🇪 DEU (+49)" },
  { code: "+39", label: "🇮🇹 ITA (+39)" },
  { code: "+34", label: "🇪🇸 ESP (+34)" },
  { code: "+65", label: "🇸🇬 SGP (+65)" },
  { code: "+971", label: "🇦🇪 UAE (+971)" },
];

const getStationLatLng = (station) => {
  if (!station) return null;
  const coords = station.coordinates?.coordinates || station.coordinates;
  if (!coords) return null;
  if (Array.isArray(coords) && coords.length >= 2) {
    return { lat: Number(coords[1]), lon: Number(coords[0]) };
  }
  if (typeof coords === "object") {
    const lat = coords.latitude ?? coords.lat ?? coords[1];
    const lon = coords.longitude ?? coords.lng ?? coords[0];
    if (lat != null && lon != null) return { lat: Number(lat), lon: Number(lon) };
  }
  return null;
};

const LuggageBookingForm = ({ 
  prefilledStation = undefined, 
  mode = "direct", 
  onBookingComplete = undefined, 
  showHeader = true, 
  compact = false 
}) => {
  const [formData, setFormData] = useState({
    stationId: "",
    dropOffDate: "",
    pickUpDate: "",
    smallBagCount: 0,
    largeBagCount: 0,
    specialInstructions: "",
    fullName: "",
    email: "",
    phoneCode: "+61",
    phoneNumber: "",
    phone: "+61 ",
    termsAccepted: false,
  });

  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryRef = useRef(null);

const [stations, setStations] = useState([]);
const [stationTimings, setStationTimings] = useState(null);
const [isLoadingTimings, setIsLoadingTimings] = useState(false);
const [timingsFetchError, setTimingsFetchError] = useState(null);
const [isFormValid, setIsFormValid] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasSpecialInstructions, setHasSpecialInstructions] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [capacityStatus, setCapacityStatus] = useState(null);
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
  const [alternativeStations, setAlternativeStations] = useState([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  // const [autoCorrectDropInfo, setAutoCorrectDropInfo] = useState("");
  // const [autoCorrectPickInfo, setAutoCorrectPickInfo] = useState("");
  const [dateErrors, setDateErrors] = useState({
    dropOff: null,
    pickUp: null
  });
  const [selectedStationMeta, setSelectedStationMeta] = useState(null);

  const LUGGAGE_PRICING = {
    small: 3.99,
    medium_large: 8.49,
  };

  const totalBags = useMemo(() => 
    formData.smallBagCount + formData.largeBagCount,
    [formData.smallBagCount, formData.largeBagCount]
  );

  const getCurrentDateTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  };

  const filteredCountryCodes = COUNTRY_CODES.filter(c =>
    c.label.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch)
  );

  useEffect(() => {
    const handler = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getMinDateTime = () => {
    const now = getCurrentDateTime();
    return now.toISOString().slice(0, 16);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentStep > 1 && !isFormValid && (formData.fullName || formData.email)) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep, isFormValid, formData.fullName, formData.email]);

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

  useEffect(() => {
    if (!prefilledStation) return;
    try {
      const stationId = prefilledStation._id || prefilledStation.id || undefined;
      if (!stationId) return;
      if (formData.stationId === stationId) {
        setSelectedStationMeta(prefilledStation);
        return;
      }
      setFormData(prev => ({ ...prev, stationId }));
      setSelectedStationMeta(prefilledStation);
      if (typeof window !== "undefined" && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.warn("Failed to apply prefilledStation:", err);
    }
  }, [prefilledStation]);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/station/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let stationsList = data.stations || [];

        const getUserPosition = () =>
          new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('Geolocation not available'));
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos.coords),
              (err) => reject(err),
              { timeout: 5000 }
            );
          });

        try {
          const coords = await getUserPosition();
          const userLat = coords.latitude;
          const userLon = coords.longitude;
          stationsList = stationsList
            .map((s) => {
              const ll = getStationLatLng(s);
              if (ll && !Number.isNaN(ll.lat) && !Number.isNaN(ll.lon)) {
                return { ...s, distance: haversineDistance(userLat, userLon, ll.lat, ll.lon) };
              }
              return s;
            })
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        } catch (err) {
          console.warn('⚠️ Could not obtain user location', err);
        }

        setStations(stationsList);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      }
    };
    fetchStations();
  }, []);

useEffect(() => {
  const fetchStationTimings = async () => {
    if (!formData.stationId) {
      setStationTimings(null);
      setIsLoadingTimings(false);
      setTimingsFetchError(null);
      return;
    }
    
    setIsLoadingTimings(true);
    setTimingsFetchError(null);
    
    try {
      const response = await fetch(`/api/station/${formData.stationId}/timings`);
      if (!response.ok) {
        setStationTimings({ is24Hours: true });
        setIsLoadingTimings(false);
        return;
      }
      const data = await response.json();
      if (data.success && data.timings) {
        setStationTimings(data.timings);
      } else {
        setStationTimings({ is24Hours: true });
      }
    } catch (error) {
      console.error("❌ Failed to fetch station timings:", error);
      setStationTimings({ is24Hours: true });
      setTimingsFetchError("Unable to load station hours");
    } finally {
      setIsLoadingTimings(false);
    }
  };
  fetchStationTimings();
}, [formData.stationId]);


  const fetchAlternativeStations = useCallback(async () => {
  try {
    const currentStation = stations.find(s => s._id === formData.stationId);
      if (!currentStation?.coordinates) return;
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
          luggageCount: totalBags
        })
      });
      const data = await response.json();
      if (data.success && data.alternatives && data.alternatives.length > 0) {
        setAlternativeStations(data.alternatives);
        setShowAlternatives(true);
      } else {
        setAlternativeStations([]);
        setShowAlternatives(false);
      }
    } catch (error) {
      console.error('Failed to fetch alternatives:', error);
    }
  }, [stations, formData.stationId, formData.dropOffDate, formData.pickUpDate, totalBags]);


 const checkStationCapacity = useCallback(async () => {
  if (!formData.stationId || !formData.dropOffDate || !formData.pickUpDate || !totalBags) {
    return;
 }
  setIsCheckingCapacity(true);
    try {
      const response = await fetch('/api/station/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: formData.stationId,
          dropOffDate: formData.dropOffDate,
          pickUpDate: formData.pickUpDate,
          luggageCount: totalBags
        })
      });
      const data = await response.json();
      if (response.ok && data) {
        setCapacityStatus(data);
        if (!data.available) {
          await fetchAlternativeStations();
        } else {
          setShowAlternatives(false);
          setAlternativeStations([]);
        }
      }
    } catch (error) {
      console.error('Capacity check failed:', error);
} finally {
      setIsCheckingCapacity(false);
    }
  }, [formData.stationId, formData.dropOffDate, formData.pickUpDate, totalBags, fetchAlternativeStations]);



  useEffect(() => {
  if (formData.stationId && formData.dropOffDate && formData.pickUpDate && totalBags) {
    const debounceTimer = setTimeout(() => {
      checkStationCapacity();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }
}, [formData.stationId, formData.dropOffDate, formData.pickUpDate, totalBags, checkStationCapacity]);

  const selectAlternativeStation = (alternativeStation) => {
    setFormData(prev => ({
      ...prev,
      stationId: alternativeStation._id
    }));
    setShowAlternatives(false);
    setAlternativeStations([]);
    setCapacityStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateNumberOfDays = () => {
    if (!formData.dropOffDate || !formData.pickUpDate) return 1;
    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(formData.pickUpDate);
    const differenceInMs = pickUp - dropOff;
    return Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
  };

  const numberOfDays = calculateNumberOfDays();

  const totalAmount = useMemo(() => 
    numberOfDays * (
      formData.smallBagCount * LUGGAGE_PRICING.small +
      formData.largeBagCount * LUGGAGE_PRICING.medium_large
    ),
    [numberOfDays, formData.smallBagCount, formData.largeBagCount]
  );

  const isStep1Valid = () => {
    return formData.stationId && formData.dropOffDate && formData.pickUpDate && 
           !dateErrors.dropOff && !dateErrors.pickUp;
  };

  const isStep2Valid = () => {
    return totalBags > 0 && !(capacityStatus && !capacityStatus.available);
  };

  const isStep3Valid = () => {
    return formData.fullName && formData.email && !errors.email && formData.phoneNumber;
  };

  const getStep1InvalidReason = () => {
    if (!formData.stationId) return "Please select a storage station.";
    if (!formData.dropOffDate || !formData.pickUpDate) return "Please set both Drop-off and Pick-up times.";
    if (dateErrors.dropOff) return dateErrors.dropOff;
    if (dateErrors.pickUp) return dateErrors.pickUp;
    return "Please complete required fields.";
  };

  const getStep2InvalidReason = () => {
    if (totalBags === 0) return "Please select at least one bag.";
    if (capacityStatus && !capacityStatus.available) {
      return "Selected station is at capacity for those dates — choose an alternative station.";
    }
    return "Please complete required fields.";
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "email") {
      let emailError = "";
      if (!EMAIL_REGEX.test(value)) {
        emailError = "Please enter a valid email address";
      }
      setErrors(prev => ({ ...prev, email: emailError }));
      setFormData(prev => ({ ...prev, email: value }));
      return;
    }

    if (name === "phoneNumber") {
      const onlyNumbers = value.replace(/\D/g, "");
      setFormData(prev => ({
        ...prev,
        phoneNumber: onlyNumbers,
        phone: `${prev.phoneCode} ${onlyNumbers}`,
      }));
      return;
    }

    if (name === "phoneCode") {
      setFormData(prev => ({
        ...prev,
        phoneCode: value,
        phone: `${value} ${prev.phoneNumber}`,
      }));
      return;
    }

    // ✅ NEW: Handle dropOffDate - NO AUTO-FILL
if (name === "dropOffDate" && value) {
  updatedFormData.dropOffDate = value;
  setDateErrors(prev => ({ ...prev, dropOff: null }));
  // setAutoCorrectDropInfo("");
  
  // Clear pick-up if it's now invalid
  if (formData.pickUpDate) {
    const dropOff = new Date(value);
    const pickUp = new Date(formData.pickUpDate);
    const minPickUp = new Date(dropOff.getTime() + 60 * 60 * 1000);
    
    if (pickUp < minPickUp) {
      updatedFormData.pickUpDate = "";
      // setAutoCorrectDropInfo("⚠️ Pick-up time was reset. Please select a new pick-up time.");
    }
  }
  
  setFormData(updatedFormData);
  return;
}

// ✅ NEW: Handle pickUpDate - Simple validation
if (name === "pickUpDate" && value) {
  if (formData.dropOffDate) {
    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(value);
    const minPickUp = new Date(dropOff.getTime() + 60 * 60 * 1000);
    
    if (pickUp < minPickUp) {
      setDateErrors(prev => ({ 
        ...prev, 
        pickUp: "Pick-up time must be at least 1 hour after drop-off time" 
      }));
      // setAutoCorrectPickInfo("");
      return;
    }
  }
  
  updatedFormData.pickUpDate = value;
  setDateErrors(prev => ({ ...prev, pickUp: null }));
  // setAutoCorrectPickInfo("");
  setFormData(updatedFormData);
  return;
}
     

    setFormData(updatedFormData);
  };

  useEffect(() => {
    const errorsObj = {};
    
    if (!formData.fullName) errorsObj.fullName = "Full Name is required";
    if (!formData.email) {
      errorsObj.email = "Email is required";
    } else if (!EMAIL_REGEX.test(formData.email)) {
      errorsObj.email = "Please enter a valid email address";
    }

    if (!formData.phoneNumber) errorsObj.phone = "Phone is required";
    if (!formData.dropOffDate) errorsObj.dropOffDate = "Drop-off Date is required";
    if (!formData.pickUpDate) errorsObj.pickUpDate = "Pick-up Date is required";
    if (!formData.termsAccepted) errorsObj.termsAccepted = "You must agree to the terms";
    if (!formData.stationId) errorsObj.stationId = "Please select a station";

    if (formData.dropOffDate) {
      const now = getCurrentDateTime();
      const dropOff = new Date(formData.dropOffDate);
      if (dropOff < now) {
        errorsObj.dropOffDate = "Drop-off time cannot be in the past";
      }
    }

    if (formData.dropOffDate && formData.pickUpDate) {
      const dropOff = new Date(formData.dropOffDate);
      const pickUp = new Date(formData.pickUpDate);
      const timeDifferenceInHours = (pickUp - dropOff) / (1000 * 60 * 60);
      if (pickUp <= dropOff) {
        errorsObj.pickUpDate = "Pick-up time must be after drop-off time";
      } else if (timeDifferenceInHours < 1) {
        errorsObj.pickUpDate = "Pick-up time must be at least 1 hour after drop-off time";
      }
    }

    if (dateErrors.dropOff) errorsObj.dropOffDate = dateErrors.dropOff;
    if (dateErrors.pickUp) errorsObj.pickUpDate = dateErrors.pickUp;
    
    if (capacityStatus && !capacityStatus.available) {
      errorsObj.capacity = "Station is at capacity. Please select an alternative.";
    }

    setErrors(errorsObj);
    setIsFormValid(Object.keys(errorsObj).length === 0);
  }, [formData, capacityStatus, dateErrors]);

  // ✅ UPDATE THIS FUNCTION in your LuggageBookingForm.js
// Replace the existing handlePaymentSuccess function with this one

const handlePaymentSuccess = async (paymentData) => {
  setIsLoading(true);
  try {
    console.log("💳 Payment successful, creating booking with data:", paymentData);

    const response = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        luggageCount: totalBags,
        paymentData, // ✅ Send complete payment data instead of just paymentId
        totalAmount,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to send booking details.");
    }

    const data = await response.json();
    
    if (data.success) {
      console.log("✅ Booking created successfully:", {
        bookingReference: data.bookingReference,
        paymentReference: data.paymentReference,
        bookingId: data.bookingId,
        paymentId: data.paymentId
      });

      try {
        if (onBookingComplete) onBookingComplete(data);
      } catch (err) {
        console.warn("onBookingComplete threw", err);
      }

      // Redirect to success page
      window.location.href = "/Booked";
    } else {
      alert("❌ Failed to send booking email.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert(`An error occurred: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

  const shouldShowPriceCard =
    currentStep >= 2 &&
    (totalBags > 0 || formData.dropOffDate || formData.pickUpDate);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isPaymentProcessing) {
        e.preventDefault();
        e.returnValue =
          "Your payment is currently being processed. Please do not close or refresh this page.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isPaymentProcessing]);

  return (
    <>
      {showHeader && <Header />}
      <div className={`${styles.pageWrapper} ${compact ? styles.compact : ""}`}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Store Your Luggage</h1>
              <p className={styles.heroSubtitle}>
                Secure, convenient storage at your chosen station
              </p>
            </div>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.formSection}>
              <div className={styles.formCard}>
                <div className={styles.progressBar}>
                  <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>1</div>
                    <span className={styles.stepLabel}>Station & Schedule</span>
                  </div>
                  <div className={styles.stepLine}></div>
                  <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>2</div>
                    <span className={styles.stepLabel}>Luggage</span>
                  </div>
                  <div className={styles.stepLine}></div>
                  <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>3</div>
                    <span className={styles.stepLabel}>Personal Info</span>
                  </div>
                  <div className={styles.stepLine}></div>
                  <div className={`${styles.step} ${currentStep >= 4 ? styles.active : ""}`}>
                    <div className={styles.stepCircle}>4</div>
                    <span className={styles.stepLabel}>Payment</span>
                  </div>
                </div>

                <form onSubmit={(e) => e.preventDefault()}>
                  {currentStep === 1 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Where & When?</h2>

                      <div className={styles.inputGroup}>
                        <label htmlFor="stationId" className={styles.label}>
                          <span className={styles.labelIcon}>📍</span>
                          Storage Station
                        </label>

                        {mode !== "map" && (
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
                                {station.distance ? ` (${station.distance.toFixed(1)} km)` : ""}
                              </option>
                            ))}
                          </select>
                        )}

                        {mode === "map" && selectedStationMeta && (
                          <div className={styles.selectedStation}>
                            <div className={styles.selectedStationTitle}>Selected Station</div>
                            <div className={styles.selectedStationName}>{selectedStationMeta.name}</div>
                            <div className={styles.selectedStationLocation}>{selectedStationMeta.location}</div>
                            <div style={{ height: 8 }} />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, stationId: "" }));
                                setSelectedStationMeta(null);
                              }}
                              className={styles.selectAlternativeBtn}
                            >
                              Change station
                            </button>
                          </div>
                        )}

                        {errors.stationId && <span className={styles.errorText}>{errors.stationId}</span>}
</div>

{isLoadingTimings && (
  <div className={styles.loadingTimings}>
    <span>⏳ Loading station hours...</span>
  </div>
)}

{timingsFetchError && (
  <div className={styles.timingError}>
    <span className={styles.errorIcon}>⚠️</span>
    <span>{timingsFetchError}. Times shown may not reflect actual station hours.</span>
  </div>
)}

{isCheckingCapacity && (
                        <div className={styles.checkingTimings}>
                          Checking station capacity…
                        </div>
                      )}

<div className={styles.inputGroup}>
  <VisualDateTimePicker
    dropOffValue={formData.dropOffDate}
    pickUpValue={formData.pickUpDate}
    onChange={handleChange}
    stationTimings={stationTimings}
    minDate={getMinDateTime()}
    disabled={!formData.stationId}
  />

  {/* Error Messages */}
  {dateErrors.dropOff && (
    <div className={styles.dateErrorBox}>
      <span className={styles.dateErrorIcon}>⚠️</span>
      <span className={styles.dateErrorText}>{dateErrors.dropOff}</span>
    </div>
  )}
  {dateErrors.pickUp && (
    <div className={styles.dateErrorBox}>
      <span className={styles.dateErrorIcon}>⚠️</span>
      <span className={styles.dateErrorText}>{dateErrors.pickUp}</span>
    </div>
  )}
  {errors.dropOffDate && !dateErrors.dropOff && (
    <span className={styles.errorText}>{errors.dropOffDate}</span>
  )}
  {errors.pickUpDate && !dateErrors.pickUp && (
    <span className={styles.errorText}>{errors.pickUpDate}</span>
  )}
</div>

                      {!isStep1Valid() && (
                        <div className={styles.warningBox} style={{ marginBottom: 12 }}>
                          {getStep1InvalidReason()}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => isStep1Valid() && setCurrentStep(2)}
                        className={styles.btnPrimary}
                        disabled={!isStep1Valid()}
                      >
                        Continue to Luggage →
                      </button>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Luggage Details</h2>

                      <div className={styles.inputGroup}>
                        <label className={styles.label}>
                          <span className={styles.labelIcon}>🧳</span>
                          Luggage Size & Quantity
                        </label>

                        <div className={styles.sizeGrid}>
                          <div className={styles.sizeCard}>
                            <img src="/images/small-bags.png" width={70} height={70} alt="Small bags" />
                            <div className={styles.sizeName}>Small Bags</div>
                            <div className={styles.sizeDesc}>Laptop bag, Backpack</div>
                            <div className={styles.sizeDesc}>A${LUGGAGE_PRICING.small}/day</div>

                            <div className={styles.counterGroup}>
                              <div className={styles.counterWrapper}>
                                <button
                                  type="button"
                                  className={styles.counterBtn}
                                  onClick={() =>
                                    setFormData(prev => ({
                                      ...prev,
                                      smallBagCount: Math.max(0, prev.smallBagCount - 1),
                                    }))
                                  }
                                >
                                  −
                                </button>
                                <span className={styles.counterValue}>
                                  {formData.smallBagCount}
                                </span>
                                <button
                                  type="button"
                                  className={styles.counterBtn}
                                  onClick={() =>
                                    setFormData(prev => ({
                                      ...prev,
                                      smallBagCount: prev.smallBagCount + 1,
                                    }))
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className={styles.sizeCard}>
                            <img src="/images/big-bags.png" width={70} height={70} alt="Large bags" />
                            <div className={styles.sizeName}>Medium & Large Bags</div>
                            <div className={styles.sizeDesc}>Hand carry, Suitcase</div>
                            <div className={styles.sizeDesc}>A${LUGGAGE_PRICING.medium_large}/day</div>

                            <div className={styles.counterGroup}>
                              <div className={styles.counterWrapper}>
                                <button
                                  type="button"
                                  className={styles.counterBtn}
                                  onClick={() =>
                                    setFormData(prev => ({
                                      ...prev,
                                      largeBagCount: Math.max(0, prev.largeBagCount - 1),
                                    }))
                                  }
                                >
                                  −
                                </button>
                                <span className={styles.counterValue}>
                                  {formData.largeBagCount}
                                </span>
                                <button
                                  type="button"
                                  className={styles.counterBtn}
                                  onClick={() =>
                                    setFormData(prev => ({
                                      ...prev,
                                      largeBagCount: prev.largeBagCount + 1,
                                    }))
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

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
                              <strong>⛔ Station at capacity!</strong> Unable to accept {totalBags} more bag(s).
                              {showAlternatives && alternativeStations.length > 0 && (
                                <span> Please select an alternative station below.</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {showAlternatives && alternativeStations.length > 0 && (
                        <div className={styles.alternativesSection}>
                          <h3 className={styles.alternativesTitle}>📍 Alternative Stations Nearby</h3>
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

                      {!isStep2Valid() && (
                        <div className={styles.warningBox} style={{ marginBottom: 12 }}>
                          {getStep2InvalidReason()}
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
                          onClick={() => isStep2Valid() && setCurrentStep(3)}
                          className={styles.btnPrimary}
                          disabled={!isStep2Valid()}
                        >
                          Continue to Personal Info →
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
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
                          <div style={{ display: "flex", gap: "8px" }}>
                            <div ref={countryRef} style={{ position: "relative", maxWidth: "180px" }}>
                              <input
                                type="text"
                                className={styles.input}
                                placeholder="Search country"
                                value={countrySearch || formData.phoneCode}
                                onFocus={() => setShowCountryDropdown(true)}
                                onChange={(e) => {
                                  setCountrySearch(e.target.value);
                                  setShowCountryDropdown(true);
                                }}
                              />

                              {showCountryDropdown && (
                                <div className={styles.countryDropdown}>
                                  {filteredCountryCodes.map(c => (
                                    <div
                                      key={c.code}
                                      className={styles.countryOption}
                                      onClick={() => {
                                        setFormData(prev => ({
                                          ...prev,
                                          phoneCode: c.code,
                                          phone: `${c.code} ${prev.phoneNumber}`,
                                        }));
                                        setCountrySearch("");
                                        setShowCountryDropdown(false);
                                      }}
                                    >
                                      {c.label}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <input
                              type="tel"
                              name="phoneNumber"
                              value={formData.phoneNumber}
                              onChange={handleChange}
                              className={styles.input}
                              placeholder="412345678"
                            />
                          </div>
                          {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                        </div>
                      </div>

                      <div className={styles.buttonRow}>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className={styles.btnSecondary}
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => isStep3Valid() && setCurrentStep(4)}
                          className={styles.btnPrimary}
                          disabled={!isStep3Valid()}
                        >
                          Continue to Payment →
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
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
                              {stations.find((s) => s._id === formData.stationId)?.name || selectedStationMeta?.name || "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.reviewSection}>
                          <h3 className={styles.reviewTitle}>Luggage Information</h3>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Small Bags:</span>
                            <span className={styles.reviewValue}>{formData.smallBagCount}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Medium & Large Bags:</span>
                            <span className={styles.reviewValue}>{formData.largeBagCount}</span>
                          </div>
                          <div className={styles.reviewItem}>
                            <span className={styles.reviewLabel}>Total Bags:</span>
                            <span className={styles.reviewValue}>{totalBags}</span>
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
                          <span>
                            I agree to the{" "}
                            <button
                              type="button"
                              onClick={() => setShowTermsModal(true)}
                              className={styles.legalBtn}
                            >
                              Terms & Conditions
                            </button>
                          </span>
                        </label>
                        {errors.termsAccepted && (
                          <span className={styles.errorText}>{errors.termsAccepted}</span>
                        )}
                      </div>

                      {isLoading || isPaymentProcessing ? (
                        <div className={styles.loadingContainer}>
                          <div className={styles.spinner}></div>
                          <p className={styles.loadingText}>
                            {isPaymentProcessing ? "Processing payment..." : "Processing your booking, Please do not close the window..."}
                          </p>
                          {isPaymentProcessing && (
                            <p className={styles.subtext}>Please don&apos;t close this window</p>
                          )}
                        </div>
                      ) : isFormValid ? (
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
                          Please review all the booking details and accept the terms to proceed.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className={styles.btnSecondary}
                        disabled={isLoading || isPaymentProcessing}
                      >
                        ← Back to Personal Info
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            <div className={styles.sidebar}>
              {shouldShowPriceCard && (
                <div className={styles.priceCard}>
                  <h3 className={styles.priceTitle}>Booking Summary</h3>

                  <div className={`${styles.collapsibleContent} ${isSummaryExpanded ? styles.expanded : ''}`}>
                    <div className={styles.priceBreakdown}>
                      <div className={styles.priceRow}>
                        <span className={styles.priceLabel}>Small bags</span>
                        <span className={styles.priceValue}>
                          {formData.smallBagCount} × A${LUGGAGE_PRICING.small}
                        </span>
                      </div>
                      <div className={styles.priceRow}>
                        <span className={styles.priceLabel}>Medium & Large bags</span>
                        <span className={styles.priceValue}>
                          {formData.largeBagCount} × A${LUGGAGE_PRICING.medium_large}
                        </span>
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
                        <span>A$2000 Coverage</span>
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
              )}
            </div>
          </div>
        </div>
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
                Please ensure your luggage does not contain prohibited items such as
                valuables, electronics, passports, or hazardous materials. Refunds and
                cancellations are subject to our cancellation policy.
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
    </>
  );
};

export default LuggageBookingForm;