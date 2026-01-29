// app/map-booking/page.js - WITH STATION PREVIEW CARD
"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense} from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import InteractiveMap from "@/components/InteractiveMap";
import LuggageBookingForm from "../../components/booking-form/LuggageBookingForm.js";
import StationPreviewCard from "../../components/StationPreviewCard/StationPreviewCard.js"; // 🆕 ADDED
import { Search, X, MapPin, Navigation, ChevronUp, Loader as LoaderIcon, AlertCircle } from "lucide-react";
import styles from "./MapBooking.module.css";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || isNaN(v))) return Infinity;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function MapBookingContent() {
  const searchParams = useSearchParams();
  
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allStations, setAllStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [zoomTo, setZoomTo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [error, setError] = useState(null);
  const [nearMeMode, setNearMeMode] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPromptMessage, setLocationPromptMessage] = useState("");
  
  // 🆕 NEW STATES FOR PREVIEW FLOW
  const [showPreview, setShowPreview] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  const suggestionsRef = useRef(null);
  const hasProcessedParams = useRef(false);

  const urlSearch = searchParams?.get("search");
  const urlStationId = searchParams?.get("stationId");
  const urlLat = searchParams?.get("lat");
  const urlLng = searchParams?.get("lng");
  const urlNearby = searchParams?.get("nearby") === "true";

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 968;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileDrawer(false);
        setDrawerExpanded(false);
        document.body.style.overflow = "";
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (isMobile && showMobileDrawer && drawerExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, showMobileDrawer, drawerExpanded]);

  useEffect(() => {
    let mounted = true;
    const fetchStations = async () => {
      setIsLoadingStations(true);
      setError(null);
      try {
        const response = await fetch("/api/station/list");
        if (!response.ok) throw new Error(`Failed to fetch stations: ${response.status}`);
        const data = await response.json();
        if (!mounted) return;
        if (data.stations && Array.isArray(data.stations)) {
          setAllStations(data.stations);
          setFilteredStations(data.stations);
        } else {
          throw new Error("Invalid stations data");
        }
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load stations");
      } finally {
        if (mounted) setIsLoadingStations(false);
      }
    };
    fetchStations();
    return () => {
      mounted = false;
    };
  }, []);

  const checkAndPromptLocation = async () => {
    if (!navigator.geolocation || !navigator.permissions) return;
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      if (result.state === "prompt" || result.state === "denied") {
        setShowLocationPrompt(true);
        if (result.state === "denied") {
          setLocationPromptMessage("Enable location access in your browser settings to see distances.");
        } else {
          setLocationPromptMessage("Allow location access to see distances to storage stations.");
        }
      }
    } catch (error) {
      console.error("Error checking location permission:", error);
    }
  };

  const sortStationsByDistance = useCallback((stations, userLoc) => {
    if (!userLoc || !userLoc.lat || !userLoc.lng) return stations;
    return [...stations]
      .map((station) => {
        const coords = station.coordinates?.coordinates;
        if (!coords || coords.length < 2) return { ...station, distance: Infinity };
        const [lng, lat] = coords;
        const distance = calculateDistance(userLoc.lat, userLoc.lng, lat, lng);
        return { ...station, distance };
      })
      .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  }, []);

  useEffect(() => {
    if (hasProcessedParams.current || isLoadingStations || allStations.length === 0) return;
    hasProcessedParams.current = true;

    // Handle station ID
    if (urlStationId) {
      const station = allStations.find((s) => s._id === urlStationId);
      if (station) {
        const coords = station.coordinates?.coordinates;
        if (coords && coords.length >= 2) {
          const [lng, lat] = coords;
          setSelectedStation({ ...station, lat, lng });
          setZoomTo({ lat, lng });
          setSearchTerm(station.name || "");
          
          // 🆕 MODIFIED: Show preview first
          setShowPreview(true);
          setShowBookingForm(false);
          
          if (isMobile) {
            setShowMobileDrawer(true);
            setDrawerExpanded(true);
          }
        }
      }
      return;
    }

    if (urlNearby && urlLat && urlLng) {
      const lat = parseFloat(urlLat);
      const lng = parseFloat(urlLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        const userLoc = { lat, lng };
        setUserLocation(userLoc);
        setZoomTo(userLoc);
        setNearMeMode(true);
        const sorted = sortStationsByDistance(allStations, userLoc);
        setFilteredStations(sorted);
        setSearchTerm("Nearest locations");
        checkAndPromptLocation();
      }
      return;
    }

    if (urlSearch) {
      const query = urlSearch.toLowerCase().trim();
      setSearchTerm(urlSearch);

      if (urlLat && urlLng) {
        const lat = parseFloat(urlLat);
        const lng = parseFloat(urlLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          setZoomTo({ lat, lng });
          const searchedLocation = { lat, lng };
          const sorted = sortStationsByDistance(allStations, searchedLocation);
          setFilteredStations(sorted);
          return;
        }
      }

      const matches = allStations.filter(
        (station) =>
          station.name?.toLowerCase().includes(query) ||
          station.location?.toLowerCase().includes(query)
      );
      setFilteredStations(matches);

      if (matches.length > 0) {
        const firstStation = matches[0];
        const coords = firstStation.coordinates?.coordinates;
        if (coords && coords.length >= 2) {
          const [lng, lat] = coords;
          setZoomTo({ lat, lng });
        }
      }
    }
  }, [allStations, isLoadingStations, urlStationId, urlSearch, urlLat, urlLng, urlNearby, isMobile, sortStationsByDistance]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setHighlightedIndex(-1);
    if (!value.trim()) {
      setSuggestions([]);
      setFilteredStations(allStations);
      return;
    }
    const query = value.toLowerCase();
    let matches = allStations
      .map((station) => {
        const coords = station.coordinates?.coordinates;
        let distance = null;
        if (userLocation && coords && coords.length >= 2) {
          const [lng, lat] = coords;
          distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        }
        return { ...station, distance };
      })
      .filter(
        (station) =>
          station.name?.toLowerCase().includes(query) ||
          station.location?.toLowerCase().includes(query)
      );
    if (nearMeMode && userLocation) {
      matches.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }
    setSuggestions(matches.slice(0, 6));
    setFilteredStations(matches);
  };

  const handleSearchKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
      if (suggestions[idx]) handleSelectSuggestion(suggestions[idx]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  };

  const handleSelectSuggestion = (station) => {
    if (!station) return;
    const coords = station.coordinates?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    setZoomTo({ lat, lng });
    setSelectedStation({ ...station, lat, lng });
    setSearchTerm(station.name || "");
    setSuggestions([]);
    setHighlightedIndex(-1);
    
    // 🆕 MODIFIED: Show preview first
    setShowPreview(true);
    setShowBookingForm(false);
    
    if (isMobile) {
      setShowMobileDrawer(true);
      setDrawerExpanded(true);
    }
  };

  // 🆕 MODIFIED: handleStationSelect now shows preview first
  const handleStationSelect = (station) => {
    const lat = station.lat ?? station.coordinates?.coordinates?.[1];
    const lng = station.lng ?? station.coordinates?.coordinates?.[0];
    if (!lat || !lng) return;
    setSelectedStation({ ...station, lat, lng });
    setZoomTo({ lat, lng });
    
    // 🆕 Show preview instead of form
    setShowPreview(true);
    setShowBookingForm(false);
    
    if (isMobile) {
      setShowMobileDrawer(true);
      setDrawerExpanded(false); // Start minimized
    }
  };

  // 🆕 NEW FUNCTION: Handle "Book This Station" from preview
  const handleBookStation = () => {
    setShowPreview(false);
    setShowBookingForm(true);
    
    if (isMobile) {
      setDrawerExpanded(true); // Expand drawer for form
    }
  };

  const toggleDrawer = () => {
    if (!showMobileDrawer) {
      setShowMobileDrawer(true);
      setDrawerExpanded(true);
    } else {
      setDrawerExpanded(!drawerExpanded);
    }
  };

  const closeDrawer = () => {
    setShowMobileDrawer(false);
    setDrawerExpanded(false);
    setSelectedStation(null);
    setShowPreview(false);
    setShowBookingForm(false);
    document.body.style.overflow = "";
  };

  const toggleNearMe = () => {
    setNearMeMode((prev) => !prev);
    if (userLocation && searchTerm) {
      const sorted = sortStationsByDistance(filteredStations, userLocation);
      setFilteredStations(sorted);
      setSuggestions(sorted.slice(0, 6));
    }
  };

  const handleBookingComplete = () => {
    setSelectedStation(null);
    setShowMobileDrawer(false);
    setDrawerExpanded(false);
    setShowPreview(false);
    setShowBookingForm(false);
    document.body.style.overflow = "";
  };

  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setShowLocationPrompt(false);
        const sorted = [...filteredStations].sort((a, b) => {
          const coords = a.coordinates?.coordinates;
          if (!coords) return 1;
          const distA = calculateDistance(latitude, longitude, coords[1], coords[0]);
          const coordsB = b.coordinates?.coordinates;
          if (!coordsB) return -1;
          const distB = calculateDistance(latitude, longitude, coordsB[1], coordsB[0]);
          return distA - distB;
        });
        setFilteredStations(sorted);
      },
      (error) => {
        let errorMessage = "";
        if (error.code === 1) {
          errorMessage = "Location access denied. Please enable it in browser settings.";
        } else if (error.code === 2) {
          errorMessage = "Location unavailable. Please try again.";
        } else if (error.code === 3) {
          errorMessage = "Location request timed out.";
        } else {
          errorMessage = "Unable to get location.";
        }
        setLocationPromptMessage(errorMessage);
        setTimeout(() => setLocationPromptMessage(""), 5000);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

  if (isLoadingStations) {
    return (
      <div className={styles.pageWrapper}>
        <Header />
        <div className={styles.loadingContainer}>
          <LoaderIcon className={styles.spinner} />
          <p>Loading storage locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageWrapper}>
        <Header />
        <div className={styles.errorContainer}>
          <AlertCircle className={styles.errorIcon} />
          <h2>Unable to Load Stations</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <Header />
      <div className={styles.container}>
        {showLocationPrompt && (
          <div className={styles.locationPrompt}>
            <div className={styles.locationPromptContent}>
              <MapPin className={styles.locationPromptIcon} />
              <span>{locationPromptMessage}</span>
            </div>
            <div className={styles.locationPromptActions}>
              <button onClick={handleEnableLocation} className={styles.enableLocationBtn}>
                Enable Location
              </button>
              <button onClick={() => setShowLocationPrompt(false)} className={styles.dismissBtn}>
                Not Now
              </button>
            </div>
          </div>
        )}

        <div className={`${styles.searchContainer} ${isMobile ? styles.searchContainerMobile : ""}`}>
          <div className={styles.searchBox}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search for a station or location"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className={styles.searchInput}
            />
            {userLocation && (
              <button
                onClick={toggleNearMe}
                className={`${styles.nearMeBtn} ${nearMeMode ? styles.nearMeBtnActive : ""}`}
                title="Sort by nearest"
              >
                <Navigation size={16} />
              </button>
            )}
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSuggestions([]);
                  setFilteredStations(allStations);
                }}
                className={styles.clearBtn}
                title="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {suggestions.length > 0 && (
            <div ref={suggestionsRef} className={styles.suggestions}>
              {suggestions.map((station, idx) => (
                <div
                  key={station._id}
                  data-suggestion-item
                  onClick={() => handleSelectSuggestion(station)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`${styles.suggestionItem} ${
                    highlightedIndex === idx ? styles.suggestionItemActive : ""
                  }`}
                >
                  <MapPin size={18} className={styles.suggestionIcon} />
                  <div className={styles.suggestionText}>
                    <div className={styles.suggestionName}>{station.name}</div>
                    <div className={styles.suggestionLocation}>
                      {station.location}
                      {station.distance != null && userLocation && (
                        <span className={styles.distanceBadge}>
                          {station.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.contentGrid}>
          <div className={`${styles.mapSection} ${isMobile ? styles.mapSectionMobile : ""}`}>
            <InteractiveMap
              onStationSelect={handleStationSelect}
              prefilledStation={selectedStation}
              zoomTo={zoomTo}
              theme="dark"
              stations={filteredStations}
            />
          </div>

          {/* 🆕 DESKTOP SIDEBAR - PREVIEW OR FORM */}
          {!isMobile && (
            <div className={styles.formSidebar}>
              {selectedStation ? (
                <>
                  {/* 🆕 Show preview first */}
                  {showPreview && (
                    <StationPreviewCard
                      station={selectedStation}
                      onBook={handleBookStation}
                      onClose={closeDrawer}
                      onViewOnMap={() => setZoomTo({ 
                        lat: selectedStation.lat, 
                        lng: selectedStation.lng 
                      })}
                      currentCapacity={selectedStation.currentCapacity}
                      mode="modal"
                    />
                  )}
                  
                  {/* 🆕 Show form after "Book" clicked */}
                  {showBookingForm && (
                    <LuggageBookingForm
                      prefilledStation={selectedStation}
                      mode="map"
                      onBookingComplete={handleBookingComplete}
                      showHeader={false}
                      compact={true}
                    />
                  )}
                </>
              ) : (
                <div className={styles.placeholder}>
                  <Navigation size={48} color="var(--color-primary)" />
                  <h3 className={styles.placeholderTitle}>Select a Station</h3>
                  <p className={styles.placeholderText}>
                    Click on a pin on the map or search for a station to start your booking
                  </p>
                  <div className={styles.placeholderStats}>
                    <div className={styles.placeholderStat}>
                      <strong>{allStations.length}</strong>
                      <span>Total Locations</span>
                    </div>
                    {filteredStations.length < allStations.length && (
                      <div className={styles.placeholderStat}>
                        <strong>{filteredStations.length}</strong>
                        <span>Matching Results</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🆕 MOBILE DRAWER - PREVIEW OR FORM */}
        {isMobile && showMobileDrawer && selectedStation && (
          <>
            {drawerExpanded && (
              <div className={styles.overlay} onClick={() => setDrawerExpanded(false)} />
            )}
            <div
              className={`${styles.mobileDrawer} ${
                drawerExpanded ? styles.mobileDrawerExpanded : styles.mobileDrawerMinimized
              }`}
            >
              {/* 🆕 PREVIEW MODE - Minimized header */}
              {showPreview && !drawerExpanded && (
                <div className={styles.drawerHeader} onClick={toggleDrawer}>
                  <div className={styles.drawerHandle} />
                  <div className={styles.drawerHeaderContent}>
                    <div className={styles.drawerStationInfo}>
                      <MapPin size={20} color="var(--color-primary)" />
                      <div>
                        <div className={styles.drawerStationName}>{selectedStation.name}</div>
                        <div className={styles.drawerStationLocation}>{selectedStation.location}</div>
                      </div>
                    </div>
                    <div className={styles.drawerToggle}>
                      <span className={styles.drawerToggleText}>View Details</span>
                      <ChevronUp size={20} className={styles.drawerToggleIcon} />
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDrawer();
                    }}
                    className={styles.closeDrawerBtn}
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              {/* 🆕 PREVIEW CONTENT - When expanded */}
              {showPreview && drawerExpanded && (
<div className={styles.drawerContentPreview}>  {/* ✅ NEW CLASS */}
                  <StationPreviewCard
                    station={selectedStation}
                    onBook={handleBookStation}
                    onClose={closeDrawer}
                    onViewOnMap={() => {
                      setZoomTo({ lat: selectedStation.lat, lng: selectedStation.lng });
                      setDrawerExpanded(false);
                    }}
                    currentCapacity={selectedStation.currentCapacity}
                    mode="drawer"
                  />
                </div>
              )}

              {/* 🆕 BOOKING FORM - After "Book" clicked */}
              {showBookingForm && (
                <>
                  <div className={styles.drawerHeader} onClick={toggleDrawer}>
                    <div className={styles.drawerHandle} />
                    <div className={styles.drawerHeaderContent}>
                      <div className={styles.drawerStationInfo}>
                        <MapPin size={20} color="var(--color-primary)" />
                        <div>
                          <div className={styles.drawerStationName}>{selectedStation.name}</div>
                          <div className={styles.drawerStationLocation}>{selectedStation.location}</div>
                        </div>
                      </div>
                      <div className={styles.drawerToggle}>
                        <span className={styles.drawerToggleText}>
                          {drawerExpanded ? "Minimize" : "Book Now"}
                        </span>
                        <ChevronUp
                          size={20}
                          className={styles.drawerToggleIcon}
                          style={{ transform: drawerExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeDrawer();
                      }}
                      className={styles.closeDrawerBtn}
                      title="Close"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {drawerExpanded && (
                    <div className={styles.drawerContent}>
                      <LuggageBookingForm
                        prefilledStation={selectedStation}
                        mode="map"
                        onBookingComplete={handleBookingComplete}
                        showHeader={false}
                        compact={true}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MapBookingPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.pageWrapper}>
          <Header />
          <div className={styles.loadingContainer}>
            <LoaderIcon className={styles.spinner} />
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <MapBookingContent />
    </Suspense>
  );
}