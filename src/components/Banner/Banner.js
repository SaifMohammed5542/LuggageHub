// components/Banner.js - FINAL FIXED VERSION
"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Navigation,
  Star,
  Users,
  Shield,
  TrendingUp,
  AlertCircle,
  BoxIcon,
} from "lucide-react";
import styles from "./Banner.module.css";
import Image from "next/image";

export default function Banner() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [bookingType, setBookingType] = useState("luggage"); 
// "luggage" | "key"
  const autocompleteService = useRef(null);
  const geocoderService = useRef(null);
  const sessionToken = useRef(null);

  useEffect(() => {
    setVisible(true);
    
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
      if (!e.target.closest(`.${styles.searchContainer}`)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <section className={styles.banner}>
      <div className={styles.background} aria-hidden />
      <div className={styles.pattern} aria-hidden />
      <div className={styles.blobOne} aria-hidden />
      <div className={styles.blobTwo} aria-hidden />

      <div className={styles.content}>
        <div className={styles.wrapper}>
          <div className={styles.grid}>
            <div className={`${styles.left} ${visible ? styles.show : ""}`}>
              <div className={styles.intro}>
                <div className={styles.textImageRow}>
                  <div className={styles.text}>
                    <div className={styles.badge}>
                      <span>✨ Trusted • Secure • Convenient</span>
                    </div>
                    <h1 className={styles.heading}>
                      Secure Your
                      <br />
                      <span className={styles.gradient}>Luggage</span>
                      <br />
                      Anywhere
                    </h1>
                  </div>
                 
                  <div className={styles.imageBox}>
                    <Image
                      src="/images/GlowBag.png"
                      alt="Secure Luggage Storage"
                      width={340}
                      height={340}
                      priority
                      sizes="(max-width: 768px) 28vw, 240px"
                      className={styles.logo}
                    />
                  </div>
                  
               <div className={styles.subtitleBox}>
                  <p className={styles.subtitle}>
                      Find secure storage near you in seconds. Fully insured. Starting from A$3.99/day.
                  </p>
                  </div>


                </div>
              </div>
              <div className={styles.searchSection}>
                <div className={styles.searchContainer}>
                  <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search city, area, or landmark..."
                      value={searchInput}
                      onChange={handleSearchChange}
                      onKeyDown={handleKeyDown}
                      className={styles.searchInput}
                      aria-label="Search for storage locations"
                    />
                    <button
                      onClick={handleSearch}
                      className={styles.searchButton}
                      disabled={!searchInput.trim()}
                    >
                      Find Storage
                    </button>
                  </div>

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
                  onClick={handleUseMyLocation}
                  disabled={isLoadingLocation}
                  className={styles.locationButton}
                >
                  <Navigation className={styles.locationIcon} />
                  <span>
                    {isLoadingLocation ? "Getting your location..." : "Use My Location - Find Nearest"}
                  </span>
                </button>
                {/* Booking Type Toggle */}

<div className={styles.or}>
  <p>OR</p>
</div>

{/* Wrapper for toggle + button */}
<div className={styles.bookingWrapper}>
  {/* Booking Type Toggle */}
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

  {/* Direct Booking Button */}
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

                {locationError && (
                  <div className={styles.locationError}>
                    <AlertCircle className={styles.errorIcon} />
                    <span>{locationError}</span>
                  </div>
                )}
              </div>

              <div className={styles.statsBar}>
                <div className={styles.statItem}>
                  <Users className={styles.statIcon} />
                  <div className={styles.statText}>
                    <div className={styles.statValue}>5,000+</div>
                    <div className={styles.statLabel}>Customers</div>
                  </div>
                </div>

                <div className={styles.statItem}>
                  <MapPin className={styles.statIcon} />
                  <div className={styles.statText}>
                    <div className={styles.statValue}>5+</div>
                    <div className={styles.statLabel}>Locations</div>
                  </div>
                </div>

                <div className={styles.statItem}>
                  <Star className={styles.statIcon} />
                  <div className={styles.statText}>
                    <div className={styles.statValue}>4.8★</div>
                    <div className={styles.statLabel}>Rating</div>
                  </div>
                </div>

                <div className={styles.statItem}>
                  <TrendingUp className={styles.statIcon} />
                  <div className={styles.statText}>
                    <div className={styles.statValue}>15K+</div>
                    <div className={styles.statLabel}>Bags Stored</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.right} ${visible ? styles.show : ""}`}>
              <div className={styles.visualBox}>
                <div className={styles.iconBox}>
                  <Shield className={styles.mainIcon} />
                </div>
                <h3 className={styles.visualTitle}>24/7 Secure Storage</h3>
                <p className={styles.visualText}>
                  Every bag is insured and stored with verified partners
                </p>

                <div className={styles.featureGrid}>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>🔐</div>
                    <p>A$2000 Coverage</p>
                  </div>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>✓</div>
                    <p>Verified Partners</p>
                  </div>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>⚡</div>
                    <p>Instant Booking</p>
                  </div>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>📱</div>
                    <p>24/7 Support</p>
                  </div>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>🚶</div>
                    <p>Walk Distance</p>
                  </div>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>💳</div>
                    <p>Secure Pay</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}