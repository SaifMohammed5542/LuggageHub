// components/Banner.js - HYBRID 3: FINAL CORRECTED VERSION
"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Navigation,
  BoxIcon,
  AlertCircle,
  LockKeyhole,
} from "lucide-react";
import styles from "./Banner.module.css";
import Image from "next/image";

export default function Banner() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [bookingType, setBookingType] = useState("luggage");
  const autocompleteService = useRef(null);
  const geocoderService = useRef(null);
  const sessionToken = useRef(null);

  useEffect(() => {
    const initializeGoogleMaps = () => {
      if (typeof window !== "undefined" && window.google?.maps) {
        try {
          if (window.google.maps.places && !autocompleteService.current) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
          }
          
          if (!geocoderService.current) {
            geocoderService.current = new window.google.maps.Geocoder();
          }
        } catch (error) {
          console.error("Google Maps initialization error:", error);
        }
      }
    };

    initializeGoogleMaps();

    if (!window.google?.maps) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          initializeGoogleMaps();
          clearInterval(checkInterval);
        }
      }, 100);

      setTimeout(() => clearInterval(checkInterval), 10000);
      return () => clearInterval(checkInterval);
    }
  }, []);

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchInput(value);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    const stationSuggestions = await fetchStationSuggestions(value);

    if (autocompleteService.current) {
      try {
        const request = {
          input: value,
          componentRestrictions: { country: "au" },
          types: ["geocode", "establishment"],
          sessionToken: sessionToken.current,
        };

        autocompleteService.current.getPlacePredictions(
          request,
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              const placeSuggestions = predictions.slice(0, 4).map((prediction) => ({
                type: "place",
                name: prediction.structured_formatting.main_text,
                location: prediction.structured_formatting.secondary_text || "",
                description: prediction.description,
                placeId: prediction.place_id,
              }));

              const combined = [...placeSuggestions, ...stationSuggestions];
              setSuggestions(combined);
              setShowSuggestions(combined.length > 0);
            } else {
              setSuggestions(stationSuggestions);
              setShowSuggestions(stationSuggestions.length > 0);
            }
            
            setIsLoadingSuggestions(false);
          }
        );
      } catch {
        setSuggestions(stationSuggestions);
        setShowSuggestions(stationSuggestions.length > 0);
        setIsLoadingSuggestions(false);
      }
    } else {
      setSuggestions(stationSuggestions);
      setShowSuggestions(stationSuggestions.length > 0);
      setIsLoadingSuggestions(false);
    }
  };

  const fetchStationSuggestions = async (query) => {
    try {
      const response = await fetch("/api/station/list");
      const data = await response.json();
      
      if (data.stations) {
        const matches = data.stations
          .filter(
            (station) =>
              station.name?.toLowerCase().includes(query.toLowerCase()) ||
              station.location?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 4)
          .map((station) => ({
            type: "station",
            name: station.name,
            location: station.location,
            stationId: station._id,
            coordinates: station.coordinates?.coordinates,
          }));
        
        return matches;
      }
      return [];
    } catch {
      return [];
    }
  };

  const geocodePlace = async (placeId) => {
    return new Promise((resolve, reject) => {
      if (!geocoderService.current) {
        reject(new Error("Geocoder not available"));
        return;
      }

      geocoderService.current.geocode(
        { placeId: placeId },
        (results, status) => {
          if (status === "OK" && results[0]) {
            const location = results[0].geometry.location;
            const coords = {
              lat: location.lat(),
              lng: location.lng(),
            };
            resolve(coords);
          } else {
            reject(new Error("Geocoding failed: " + status));
          }
        }
      );
    });
  };

  const handleSuggestionClick = async (suggestion) => {
    setSearchInput(suggestion.name);
    setShowSuggestions(false);

    if (suggestion.type === "station") {
      router.push(`/map-booking?stationId=${suggestion.stationId}`);
    } else if (suggestion.type === "place") {
      try {
        const coords = await geocodePlace(suggestion.placeId);
        router.push(`/map-booking?lat=${coords.lat}&lng=${coords.lng}&search=${encodeURIComponent(suggestion.description)}`);
      } catch {
        router.push(`/map-booking?search=${encodeURIComponent(suggestion.description)}`);
      }
    }
  };

  const handleSearch = () => {
    if (!searchInput.trim()) {
      return;
    }
    router.push(`/map-booking?search=${encodeURIComponent(searchInput.trim())}`);
    setShowSuggestions(false);
  };

  const handleUseMyLocation = () => {
    setIsLoadingLocation(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLoadingLocation(false);
        router.push(`/map-booking?lat=${latitude}&lng=${longitude}&nearby=true`);
      },
      (error) => {
        let errorMessage = "";
        
        if (error.code === 1) {
          errorMessage = "Location access denied. Please enable location permission in your browser settings.";
        } else if (error.code === 2) {
          errorMessage = "Location information is unavailable. Please try again.";
        } else if (error.code === 3) {
          errorMessage = "Location request timed out. Please try again.";
        } else {
          errorMessage = "Unable to get your location. Please try again or use the search bar.";
        }
        
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const floatingCard = document.querySelector('[class*="floatingCard"]');
      if (floatingCard && !floatingCard.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <section className={styles.banner}>
      <div className={styles.content}>
        {/* Diagonal Blue Header */}
        <div className={styles.heroHeader}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <LockKeyhole className={styles.lockIcon} />
              <span> Trusted by 5,000+ Travelers</span>
            </div>
          <div className={styles.textImgContent}>
            <div className={styles.textContent}>
            <h1 className={styles.heading}>
              Store Your
              {/* <br /> */}
              <span className={styles.gradient}>Luggage</span>
              {/* <br /> */}
              Securely
            </h1>
            </div>
            <div className={styles.imgContent}>
               <Image
                      src="/images/Glowedwhite.png"
                      alt="Secure Luggage Storage"
                      width={280}
                      height={200}
                      priority
                      sizes="(max-width: 768px) 28vw, 240px"
                      className={styles.logo}
                    />
            </div>
          </div>  

            <p className={styles.subtitle}>
              Find verified storage near you. A$2000 insurance. From A$3.99/day.
            </p>
{/* 
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <div className={styles.heroStatValue}>5K+</div>
                <div className={styles.heroStatLabel}>Customers</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.heroStatValue}>4.8★</div>
                <div className={styles.heroStatLabel}>Rating</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.heroStatValue}>5+</div>
                <div className={styles.heroStatLabel}>Locations</div>
              </div>
            </div> */}
            <div className={styles.quickActions2}>
          <div className={styles.quickActionsTitle}>
            <h3>Quick Actions</h3>
          </div>
                    {/* <div className={styles.or}>
            <p>OR</p>
          </div> */}

          <div className={styles.bookingWrapper}>
            <div className={styles.bookingToggle}>
              <button
                type="button"
                className={`${styles.toggleOption} ${bookingType === "luggage" ? styles.active : ""}`}
                onClick={() => setBookingType("luggage")}
              >
                🧳 Luggage
              </button>

              <button
                type="button"
                className={`${styles.toggleOption} ${bookingType === "key" ? styles.active : ""}`}
                onClick={() => setBookingType("key")}
              >
                🔑 Key
              </button>
            </div>

            <button
              onClick={() =>
                router.push(
                  bookingType === "key" ? "/key-handover" : "/booking-form"
                )
              }
              className={styles.directBookingCTA}
            >
              <BoxIcon className={styles.locationIcon} />
              {bookingType === "key" ? "Book Key Handover" : "Book Luggage Storage"}
            </button>
          </div>
        </div>
          </div>
        </div>

        {/* Floating Search Card */}
        <div className={styles.floatingCard}>
          <h2 className={styles.cardTitle}>Find Storage Now</h2>
          <p className={styles.cardSubtitle}>Enter your location to see nearby options</p>

          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input 
              type="text" 
              className={styles.searchInput} 
              placeholder="City, area, or landmark..."
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              aria-label="Search for storage locations"
            />

            {showSuggestions && (
              <div className={styles.suggestionsDropdown}>
                {isLoadingSuggestions ? (
                  <div className={styles.loadingSuggestions}>
                    <div className={styles.spinner}></div>
                    <span>Searching...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className={styles.suggestionItem}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <MapPin className={styles.suggestionIcon} />
                      <div className={styles.suggestionText}>
                        <div className={styles.suggestionName}>
                          {suggestion.name}
                          {suggestion.type === "station" && (
                            <span className={styles.stationBadge}>Storage Station</span>
                          )}
                        </div>
                        <div className={styles.suggestionLocation}>{suggestion.location}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noSuggestions}>
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            className={styles.btnPrimary}
            onClick={handleSearch}
            disabled={!searchInput.trim()}
          >
            <span>Search Locations</span>
            <span>→</span>
          </button>

          <button 
            className={styles.btnLocation}
            onClick={handleUseMyLocation}
            disabled={isLoadingLocation}
          >
            <Navigation className={styles.locationIcon} />
            <span>
              {isLoadingLocation ? "Getting your location..." : "Use My Current Location"}
            </span>
          </button>

          {locationError && (
            <div className={styles.locationError}>
              <AlertCircle className={styles.errorIcon} />
              <span>{locationError}</span>
            </div>
          )}

          {/* OR + Booking Toggle */}
          {/* <div className={styles.or}>
            <p>OR</p>
          </div>

          <div className={styles.bookingWrapper}>
            <div className={styles.bookingToggle}>
              <button
                type="button"
                className={`${styles.toggleOption} ${bookingType === "luggage" ? styles.active : ""}`}
                onClick={() => setBookingType("luggage")}
              >
                🧳 Luggage
              </button>

              <button
                type="button"
                className={`${styles.toggleOption} ${bookingType === "key" ? styles.active : ""}`}
                onClick={() => setBookingType("key")}
              >
                🔑 Key
              </button>
            </div>

            <button
              onClick={() =>
                router.push(
                  bookingType === "key" ? "/key-handover" : "/booking-form"
                )
              }
              className={styles.directBookingCTA}
            >
              <BoxIcon className={styles.locationIcon} />
              {bookingType === "key" ? "Book Key Handover" : "Book Luggage Storage"}
            </button>
          </div> */}
        </div>

        {/* Quick Actions (RIGHT AFTER SEARCH) */}
        <div className={styles.quickActions}>
          <div className={styles.quickActionsTitle}>
            <h3>Quick Actions</h3>
          </div>
                    {/* <div className={styles.or}>
            <p>OR</p>
          </div> */}

          <div className={styles.bookingWrapper}>
            <div className={styles.bookingToggle}>
              <button
                type="button"
                className={`${styles.toggleOption} ${bookingType === "luggage" ? styles.active : ""}`}
                onClick={() => setBookingType("luggage")}
              >
                🧳 Luggage
              </button>

              <button
                type="button"
                className={`${styles.toggleOption} ${bookingType === "key" ? styles.active : ""}`}
                onClick={() => setBookingType("key")}
              >
                🔑 Key
              </button>
            </div>

            <button
              onClick={() =>
                router.push(
                  bookingType === "key" ? "/key-handover" : "/booking-form"
                )
              }
              className={styles.directBookingCTA}
            >
              <BoxIcon className={styles.locationIcon} />
              {bookingType === "key" ? "Book Key Handover" : "Book Luggage Storage"}
            </button>
          </div>
        </div>

        {/* Why Choose Us (FEATURE CARDS - AFTER QUICK ACTIONS) */}
        <div className={styles.whyChooseUs}>
          <h3 className={styles.whyTitle}>Why Choose Us?</h3>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔐</div>
              <div className={styles.featureLabel}>A$2000 Insured</div>
              <div className={styles.featureDesc}>Every bag fully covered</div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚡</div>
              <div className={styles.featureLabel}>Instant Book</div>
              <div className={styles.featureDesc}>Reserve in 30 sec</div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>✓</div>
              <div className={styles.featureLabel}>Verified</div>
              <div className={styles.featureDesc}>All locations checked</div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📱</div>
              <div className={styles.featureLabel}>24/7 Support</div>
              <div className={styles.featureDesc}>Always here to help</div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {/* <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>5K+</div>
            <div className={styles.statLabel}>Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>5+</div>
            <div className={styles.statLabel}>Spots</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>4.8★</div>
            <div className={styles.statLabel}>Rating</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>15K</div>
            <div className={styles.statLabel}>Bags</div>
          </div>
        </div> */}
      </div>
    </section>
  );
}