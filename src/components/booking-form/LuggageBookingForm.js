// components/booking-form/LuggageBookingFrom.js
"use client";
import React, { useState, useEffect, useCallback } from "react";
import styles from "./Booking.module.css";
import Header from "@/components/Header";
import PayPalPayment from "../LuggagePay";
import {
  getNearestAvailableTime,
  formatDateTime,
  formatDateTimeLocal
} from "@/utils/stationTimingValidator";

/*
  NOTE: This is your original LuggageBookingForm with minimal changes:
    - component signature now accepts props: prefilledStation, mode, onBookingComplete
    - small useEffect to apply prefilledStation into formData.stationId and selectedStationMeta
    - when mode === "map" and selectedStationMeta exists, the station <select> is hidden
    - handlePaymentSuccess calls onBookingComplete(data) if provided
*/

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper: extract lat/lon from station object (supports [lng, lat] or { latitude, longitude } or { lat, lng })
const getStationLatLng = (station) => {
  if (!station) return null;
  const coords = station.coordinates?.coordinates || station.coordinates;
  if (!coords) return null;
  // Array: [lng, lat]
  if (Array.isArray(coords) && coords.length >= 2) {
    return { lat: Number(coords[1]), lon: Number(coords[0]) };
  }
  // Object: { latitude, longitude } or { lat, lng }
  if (typeof coords === "object") {
    const lat = coords.latitude ?? coords.lat ?? coords[1];
    const lon = coords.longitude ?? coords.lng ?? coords[0];
    if (lat != null && lon != null) return { lat: Number(lat), lon: Number(lon) };
  }
  return null;
};

const LuggageBookingForm = ({ prefilledStation = undefined, mode = "direct", onBookingComplete = undefined, showHeader = true, compact = false }) => {
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

  // Capacity states
  const [capacityStatus, setCapacityStatus] = useState(null);
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
  // const [capacityError, setCapacityError] = useState(null);
  const [alternativeStations, setAlternativeStations] = useState([]);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Date validation states
  const [dateErrors, setDateErrors] = useState({
    dropOff: null,
    pickUp: null
  });

  // For showing the station metadata in map mode
  const [selectedStationMeta, setSelectedStationMeta] = useState(null);

  const ratePerLuggagePerDay = 7.99;

  // Helper functions for date validation
  const getCurrentDateTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  };

  const getMinDateTime = () => {
    const now = getCurrentDateTime();
    return now.toISOString().slice(0, 16);
  };

  // validateStationTimings
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

    setIsCheckingTimings(true);
    let alerts = [];

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

  // --------------------
  // NEW: apply prefilledStation when provided (map flow)
  // --------------------
  useEffect(() => {
    if (!prefilledStation) return;

    try {
      const stationId = prefilledStation._id || prefilledStation.id || undefined;
      if (!stationId) return;

      if (formData.stationId === stationId) {
        // already applied
        setSelectedStationMeta(prefilledStation);
        return;
      }

      // Apply stationId — this will trigger existing effects (timings, capacity)
      setFormData(prev => ({ ...prev, stationId }));

      // Keep a meta copy for UI (so we can display name/location while select options load)
      setSelectedStationMeta(prefilledStation);

      // scroll to top to show the form area (helpful in mobile drawer)
      if (typeof window !== "undefined" && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      console.log("🔁 Prefilled station applied from Map:", prefilledStation.name || stationId);
    } catch (err) {
      console.warn("Failed to apply prefilledStation:", err);
    }
  }, [prefilledStation]); // runs when the map selection changes

  // Fetch available stations — sort nearest-first when possible
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

        // Try to get user's position (fast timeout). If successful, compute distance and sort.
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

          console.log('📍 Stations sorted by proximity (nearest-first)');
        } catch (err) {
          // If geolocation fails or times out, keep server order but do not fail the flow
          console.warn('⚠️ Could not obtain user location — keeping server-provided order', err);
        }

        setStations(stationsList);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      }
    };
    fetchStations();
  }, []);

  // Fetch station timings
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

  // Validate timing
  useEffect(() => {
    if (formData.stationId && stationTimings && (formData.dropOffDate || formData.pickUpDate)) {
      console.log('🔄 Times changed, validating...');
      validateStationTimings();
    }
  }, [formData.stationId, stationTimings, validateStationTimings]);

  // Capacity check function
  const checkStationCapacity = async () => {
    if (!formData.stationId || !formData.dropOffDate || !formData.pickUpDate || !formData.luggageCount) {
      return;
    }

    setIsCheckingCapacity(true);

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

        if (!data.available) {
          await fetchAlternativeStations();
        } else {
          setShowAlternatives(false);
          setAlternativeStations([]);
        }
      } else {
        console.warn('Capacity API returned non-ok or empty response', data);
    
      }
    } catch (error) {
      console.error('Capacity check failed:', error);
  
    } finally {
      setIsCheckingCapacity(false);
    }
  };

  const fetchAlternativeStations = async () => {
    try {
      console.log('🔍 Fetching alternative stations...');

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

  // Debounced capacity check
  useEffect(() => {
    if (formData.stationId && formData.dropOffDate && formData.pickUpDate && formData.luggageCount) {
      const debounceTimer = setTimeout(() => {
        checkStationCapacity();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [formData.stationId, formData.dropOffDate, formData.pickUpDate, formData.luggageCount]);

  const selectAlternativeStation = (alternativeStation) => {
    console.log('🔄 Switching to alternative station:', alternativeStation.name);

    setFormData(prev => ({
      ...prev,
      stationId: alternativeStation._id
    }));

    setShowAlternatives(false);
    setAlternativeStations([]);
    setCapacityStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Apply suggested time
  const applySuggestedTime = (timeType, suggestedDateTime) => {
    console.log('🎯 ========== APPLYING SUGGESTION ==========');
    console.log('🎯 Type:', timeType);
    console.log('🎯 Suggested time:', suggestedDateTime);

    const asDate = (d) => (d instanceof Date ? d : new Date(d));

    const getMinAllowedPickUp = (dropOffDt) => {
      return dropOffDt ? new Date(dropOffDt.getTime() + 1 * 60 * 60 * 1000) : null;
    };

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

    if (timeType === 'dropOff') {
      const dropOffDateObj = asDate(suggestedDateTime);
      const formattedDropOff = formatDateTimeLocal(dropOffDateObj);
      console.log('📥 Setting drop-off to suggested:', formattedDropOff);

      const calculatedPickup = new Date(dropOffDateObj.getTime() + 3 * 60 * 60 * 1000);
      const minAllowedPickUp = getMinAllowedPickUp(dropOffDateObj);
      if (minAllowedPickUp && calculatedPickup.getTime() < minAllowedPickUp.getTime()) {
        calculatedPickup.setTime(minAllowedPickUp.getTime());
      }

      let finalPickUpDateObj = calculatedPickup;
      let finalTimingAlert = null;

      if (stationTimings) {
        const pickUpValidation = getNearestAvailableTime(calculatedPickup.toISOString(), stationTimings);
        console.log('🔎 pickUpValidation for calculated +3h:', pickUpValidation);

        if (pickUpValidation.isValid) {
          finalPickUpDateObj = calculatedPickup;
          finalTimingAlert = null;
          console.log('✅ Calculated +3h pick-up is within open hours; no pick-up alert.');
        } else {
          const allSuggestions = pickUpValidation.suggestions || [];
          const dropMinTs = minAllowedPickUp ? minAllowedPickUp.getTime() : null;

          const suitable = allSuggestions.find((s) => {
            const sTs = new Date(s.dateTime).getTime();
            return dropMinTs ? sTs >= dropMinTs : true;
          });

          if (suitable) {
            finalPickUpDateObj = new Date(suitable.dateTime);
            finalTimingAlert = null;
            console.log('✅ Found suitable suggestion for pick-up >= drop+1hr:', suitable.dateTime);
          } else if (allSuggestions.length > 0) {
            const earliest = new Date(allSuggestions[0].dateTime);
            if (dropMinTs && earliest.getTime() < dropMinTs) {
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
            console.log('ℹ️ Using earliest suggestion for pick-up:', finalPickUpDateObj.toISOString());
          } else {
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
        finalPickUpDateObj = calculatedPickup;
        finalTimingAlert = null;
      }

      const formattedPickUp = formatDateTimeLocal(finalPickUpDateObj);
      console.log('📤 Final pick-up chosen after validation:', formattedPickUp);

      setFormData(prev => ({ ...prev, dropOffDate: formattedDropOff, pickUpDate: formattedPickUp }));
      setTimingAlert(finalTimingAlert ? [finalTimingAlert] : null);

      console.log('🎯 ========== SUGGESTION APPLIED ==========');
      return;
    }

    console.log('🎯 ========== SUGGESTION APPLIED (no-op) ==========');
  };

  const calculateNumberOfDays = () => {
    if (!formData.dropOffDate || !formData.pickUpDate) return 1;
    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(formData.pickUpDate);
    const differenceInMs = pickUp - dropOff;
    return Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
  };

  const numberOfDays = calculateNumberOfDays();
  const totalAmount = formData.luggageCount * numberOfDays * ratePerLuggagePerDay;

  // ---------- Step-2 validator + human reason ----------
  const isStep2Valid = () => {
    // basic required fields for step 2
    if (!formData.fullName || !formData.email || !formData.phone || !formData.stationId) return false;

    // schedule required
    if (!formData.dropOffDate || !formData.pickUpDate) return false;

    // date logic errors already stored in dateErrors
    if (dateErrors.dropOff || dateErrors.pickUp) return false;

    // station timing issues must be resolved
    if (timingAlert && timingAlert.length > 0) return false;

    // capacity must be available
    if (capacityStatus && !capacityStatus.available) return false;

    return true;
  };

  const getStep2InvalidReason = () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.stationId) {
      return "Please complete your personal details and choose a station.";
    }
    if (!formData.dropOffDate || !formData.pickUpDate) {
      return "Please set both Drop-off and Pick-up times.";
    }
    if (dateErrors.dropOff) {
      return dateErrors.dropOff;
    }
    if (dateErrors.pickUp) {
      return dateErrors.pickUp;
    }
    if (timingAlert && timingAlert.length > 0) {
      // Prefer to show first alert's short message
      const a = timingAlert[0];
      return a.type === "dropOff" ? "Drop-off time conflicts with station hours." : "Pick-up time conflicts with station hours.";
    }
    if (capacityStatus && !capacityStatus.available) {
      return "Selected station is at capacity for those dates — choose an alternative station.";
    }
    // fallback
    return "Please complete required fields.";
  };
  // ----------------------------------------------------

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    console.log('📝 Form field changed:', { name, value });

    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    // Handle drop-off date change
    if (name === "dropOffDate" && value) {
      console.log('📥 ========== DROP-OFF CHANGED ==========');

      const now = getCurrentDateTime();
      const selectedDropOff = new Date(value);

      // CHECK: Is drop-off in the past?
      if (selectedDropOff < now) {
        console.log('❌ Drop-off is in the past! Auto-correcting...');

        // Auto-correct to now + 10 minutes
        const correctedDropOff = new Date(now);
        correctedDropOff.setMinutes(correctedDropOff.getMinutes() + 10);

        // If station timings are available, check if corrected time is valid
        if (stationTimings && !stationTimings.is24Hours) {
          const correctedValidation = getNearestAvailableTime(correctedDropOff.toISOString(), stationTimings);

          if (!correctedValidation.isValid && correctedValidation.suggestions && correctedValidation.suggestions.length > 0) {
            // Use the nearest valid time from suggestions
            const nearestValid = correctedValidation.suggestions[0].dateTime;
            const formattedCorrected = formatDateTimeLocal(new Date(nearestValid));
            console.log('✅ Auto-corrected to nearest station opening:', formattedCorrected);
            updatedFormData.dropOffDate = formattedCorrected;

            // set user-facing message
            setDateErrors(prev => ({
              ...prev,
              dropOff: `Selected drop-off was in the past — auto-corrected to ${new Date(formattedCorrected).toLocaleString()}.`
            }));
          } else {
            // Use now + 10 minutes
            const formattedCorrected = formatDateTimeLocal(correctedDropOff);
            console.log('✅ Auto-corrected to now + 10 minutes:', formattedCorrected);
            updatedFormData.dropOffDate = formattedCorrected;

            setDateErrors(prev => ({
              ...prev,
              dropOff: `Selected drop-off was in the past — auto-corrected to ${new Date(formattedCorrected).toLocaleString()}.`
            }));
          }
        } else {
          // No timing restrictions, just use now + 10 minutes
          const formattedCorrected = formatDateTimeLocal(correctedDropOff);
          console.log('✅ Auto-corrected to now + 10 minutes:', formattedCorrected);
          updatedFormData.dropOffDate = formattedCorrected;

          setDateErrors(prev => ({
            ...prev,
            dropOff: `Selected drop-off was in the past — auto-corrected to ${new Date(formattedCorrected).toLocaleString()}.`
          }));
        }

        // Note: we don't clear the pickUp error here; pickUp will be updated below.
      } else {
        // Valid drop-off chosen by user — clear any previous dropOff message
        updatedFormData.dropOffDate = value;
        setDateErrors(prev => ({ ...prev, dropOff: null }));
        console.log('📥 Drop-off set to:', updatedFormData.dropOffDate);
      }

      // Auto-calculate pickup as +3 hours
      const dropOffTime = new Date(updatedFormData.dropOffDate);
      const calculatedPickup = new Date(dropOffTime);
      calculatedPickup.setHours(calculatedPickup.getHours() + 3);

      // Ensure pickup is at least 1 hour after drop-off
      const minPickup = new Date(dropOffTime);
      minPickup.setHours(minPickup.getHours() + 1);

      const finalPickup = calculatedPickup > minPickup ? calculatedPickup : minPickup;

      const localPickUpISO = new Date(finalPickup.getTime() - finalPickup.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      console.log('📤 Auto-calculated pickup (+3hrs, min +1hr):', localPickUpISO);
      updatedFormData.pickUpDate = localPickUpISO;

      // When auto-calculating pickup, set a message for pick-up only if it ended up being in the past
      const now2 = getCurrentDateTime();
      if (new Date(updatedFormData.pickUpDate) < now2) {
        setDateErrors(prev => ({
          ...prev,
          pickUp: `Calculated pick-up was in the past — adjusted to ${new Date(updatedFormData.pickUpDate).toLocaleString()}.`
        }));
      } else {
        // clear pick-up error on successful auto-calc
        setDateErrors(prev => ({ ...prev, pickUp: null }));
      }

      console.log('📥 ========== DROP-OFF PROCESSING DONE ==========');
      setFormData(updatedFormData);
      return;
    }

    // Handle pickup date change
    if (name === "pickUpDate" && value) {
      const selectedPickUp = new Date(value);
      const now = getCurrentDateTime();

      // Auto-correct if pickup is in the past
      if (selectedPickUp < now) {
        console.log('❌ Pickup is in the past! Auto-correcting...');
        const correctedPickup = new Date(now);
        correctedPickup.setMinutes(correctedPickup.getMinutes() + 70); // Now + 1hr 10min

        const formattedCorrected = formatDateTimeLocal(correctedPickup);
        console.log('✅ Auto-corrected pickup to:', formattedCorrected);
        updatedFormData.pickUpDate = formattedCorrected;

        setDateErrors(prev => ({
          ...prev,
          pickUp: `Selected pick-up was in the past — auto-corrected to ${new Date(formattedCorrected).toLocaleString()}.`
        }));

        setFormData(updatedFormData);
        return;
      }

      if (updatedFormData.dropOffDate) {
        const dropOffTime = new Date(updatedFormData.dropOffDate);
        const minPickupTime = new Date(dropOffTime);
        minPickupTime.setHours(minPickupTime.getHours() + 1);

        // CHECK: Is pickup less than or equal to drop-off?
        if (selectedPickUp <= dropOffTime) {
          console.log('❌ Pickup is before or equal to drop-off! Auto-correcting...');
          const correctedPickup = new Date(dropOffTime);
          correctedPickup.setHours(correctedPickup.getHours() + 3); // Drop-off + 3 hours

          const formattedCorrected = formatDateTimeLocal(correctedPickup);
          console.log('✅ Auto-corrected to drop-off + 3 hours:', formattedCorrected);
          updatedFormData.pickUpDate = formattedCorrected;

          setDateErrors(prev => ({
            ...prev,
            pickUp: `Pick-up must be after drop-off — auto-corrected to ${new Date(formattedCorrected).toLocaleString()}.`
          }));

          setFormData(updatedFormData);
          return;
        }

        if (selectedPickUp < minPickupTime) {
          console.log('❌ Pickup is less than 1 hour after drop-off! Auto-correcting...');
          const formattedCorrected = formatDateTimeLocal(minPickupTime);
          console.log('✅ Auto-corrected to drop-off + 1 hour:', formattedCorrected);
          updatedFormData.pickUpDate = formattedCorrected;

          setDateErrors(prev => ({
            ...prev,
            pickUp: `Pick-up must be at least 1 hour after drop-off — auto-corrected to ${new Date(formattedCorrected).toLocaleString()}.`
          }));

          setFormData(updatedFormData);
          return;
        }
      }

      // If we reach here, selected pick-up is valid — clear any previous pickUp message
      updatedFormData.pickUpDate = value;
      setDateErrors(prev => ({ ...prev, pickUp: null }));
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

    // Date validation
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

    // Add date errors from state
    if (dateErrors.dropOff) errorsObj.dropOffDate = dateErrors.dropOff;
    if (dateErrors.pickUp) errorsObj.pickUpDate = dateErrors.pickUp;

    if (timingAlert && timingAlert.length > 0) {
      errorsObj.timing = "Please select valid station operating hours";
    }

    if (capacityStatus && !capacityStatus.available) {
      errorsObj.capacity = "Station is at capacity. Please select an alternative.";
    }

    setErrors(errorsObj);
    setIsFormValid(Object.keys(errorsObj).length === 0);
  }, [formData, timingAlert, capacityStatus, dateErrors]);

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
      if (data.success) {
        // call callback (map page) before redirect so it can clear selection / close drawer
        try {
          if (onBookingComplete) onBookingComplete(data);
        } catch (err) {
          console.warn("onBookingComplete threw", err);
        }
        window.location.href = "/Booked";
      }
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
                  {/* Step 1 */}
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
                          Storage drop point
                        </label>

                        {/* When in map mode with a prefilled station, hide the <select> and show selected card */}
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
                                // Allow user to clear map selection and choose another station via dropdown
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

                  {/* Step 2 */}
                  {currentStep === 2 && (
                    <div className={styles.stepContent}>
                      <h2 className={styles.sectionTitle}>Luggage & Schedule</h2>

                      {/* Capacity Status */}
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

                      {/* Alternative Stations */}
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
                                  onClick={() =>
                                    selectAlternativeStation(alt)
                                  }
                                  className={styles.selectAlternativeBtn}
                                >
                                  Select This Station →
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                                    const dropOffDateObj = formData.dropOffDate ? new Date(formData.dropOffDate) : null;
                                    const minAllowedPickUpTs = dropOffDateObj ? dropOffDateObj.getTime() + 1 * 60 * 60 * 1000 : null;

                                    const filtered = alert.details.suggestions.filter((suggestion) => {
                                      if (alert.type === 'pickUp' && minAllowedPickUpTs) {
                                        const sugTs = new Date(suggestion.dateTime).getTime();
                                        return sugTs >= minAllowedPickUpTs;
                                      }
                                      return true;
                                    });

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
                            className={`${styles.input} ${dateErrors.dropOff || errors.dropOffDate ? styles.inputError : ''}`}
                            min={getMinDateTime()}
                          />
                          {dateErrors.dropOff && (
                            <div className={styles.dateErrorBox}>
                              <span className={styles.dateErrorIcon}>⚠️</span>
                              <span className={styles.dateErrorText}>{dateErrors.dropOff}</span>
                            </div>
                          )}
                          {errors.dropOffDate && !dateErrors.dropOff && (
                            <span className={styles.errorText}>{errors.dropOffDate}</span>
                          )}
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
                            className={`${styles.input} ${dateErrors.pickUp || errors.pickUpDate ? styles.inputError : ''}`}
                            min={
                              formData.dropOffDate
                                ? new Date(new Date(formData.dropOffDate).getTime() + 1 * 60 * 60 * 1000)
                                    .toISOString()
                                    .slice(0, 16)
                                : getMinDateTime()
                            }
                          />
                          {dateErrors.pickUp && (
                            <div className={styles.dateErrorBox}>
                              <span className={styles.dateErrorIcon}>⚠️</span>
                              <span className={styles.dateErrorText}>{dateErrors.pickUp}</span>
                            </div>
                          )}
                          {errors.pickUpDate && !dateErrors.pickUp && (
                            <span className={styles.errorText}>{errors.pickUpDate}</span>
                          )}
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

                      {/* Step-2 disabled reason (shows when the Continue button is disabled) */}
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
                          onClick={() => setCurrentStep(3)}
                          className={styles.btnPrimary}
                          disabled={!isStep2Valid()}
                        >
                          Continue to Payment →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 */}
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
                              {stations.find((s) => s._id === formData.stationId)?.name || selectedStationMeta?.name || "N/A"}
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
