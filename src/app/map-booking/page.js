// app/map-booking/page.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import InteractiveMap from "@/components/InteractiveMap";
// IMPORTANT: use your direct booking component (the one you pasted earlier)
import LuggageBookingForm from "../../components/booking-form/LuggageBookingForm.js";
import { Search, X, MapPin, Navigation, ChevronDown } from "lucide-react";
import styles from "./MapBooking.module.css";

/*
  Mobile-first improvements made in this file:
  - Bigger, touch-friendly search and suggestion items
  - Keyboard navigation for search suggestions (Arrow keys + Enter)
  - "Near me" quick filter button that sorts suggestions by distance
  - When selecting via search on mobile the drawer now opens expanded to make booking faster
  - Improved focus management & aria attributes for accessibility
  - Close/cleanup behavior ensures body scrolling is restored
  - Slight UI polish: clearer min/max drawer states, explicit "Book Now" CTA on minimized header
*/

export default function MapBookingPage() {
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allStations, setAllStations] = useState([]);
  const [zoomTo, setZoomTo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [nearMeMode, setNearMeMode] = useState(false);
  const userLocRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load stations and watch resize
  useEffect(() => {
    let mounted = true;
    const loadStations = async () => {
      try {
        const res = await fetch("/api/station/list");
        const data = await res.json();
        if (!mounted) return;
        setAllStations(data.stations || []);
      } catch (error) {
        console.error("Failed to load stations:", error);
      }
    };
    loadStations();

    const handleResize = () => {
      const mobile = window.innerWidth <= 968;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileDrawer(false);
        setDrawerExpanded(false);
        document.body.style.overflow = "";
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Keep body scrolling locked when drawer expanded on mobile
  useEffect(() => {
    if (isMobile && showMobileDrawer && drawerExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isMobile, showMobileDrawer, drawerExpanded]);

  // Utility: compute distance (Haversine)
  const distanceKm = (lat1, lon1, lat2, lon2) => {
    if ([lat1, lon1, lat2, lon2].some((v) => v == null)) return Infinity;
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // When InteractiveMap reports user's location, store it here for sorting
  const handleUserLocationUpdate = (loc) => {
    userLocRef.current = loc; // { lat, lng }
  };

  // Search change with improved UX
  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchTerm(input);
    setHighlightedIndex(-1);

    if (!input.trim()) {
      setSuggestions([]);
      return;
    }

    // basic fuzzy match on name / location
    const matches = allStations
      .map((s) => {
        const raw = s.coordinates?.coordinates || [];
        const lat = raw?.[1];
        const lng = raw?.[0];
        const dist =
          userLocRef.current && lat != null && lng != null
            ? distanceKm(
                userLocRef.current.lat,
                userLocRef.current.lng,
                lat,
                lng
              )
            : null;
        return { station: s, dist };
      })
      .filter(({ station }) =>
        station.name?.toLowerCase().includes(input.toLowerCase()) ||
        station.location?.toLowerCase().includes(input.toLowerCase())
      );

    // If nearMeMode, sort by distance; otherwise keep relevance and limit to 6
    matches.sort((a, b) => {
      if (nearMeMode && a.dist != null && b.dist != null) return a.dist - b.dist;
      return (a.station.name?.length || 0) - (b.station.name?.length || 0);
    });

    setSuggestions(matches.slice(0, 6).map((m) => ({ ...m.station, _distanceKm: m.dist })));
  };

  // Keyboard nav for suggestions
  const handleSearchKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(suggestions.length - 1, i + 1));
      scrollSuggestionIntoView(highlightedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(-1, i - 1));
      scrollSuggestionIntoView(highlightedIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
      handleSelectSuggestion(suggestions[idx]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  };

  const scrollSuggestionIntoView = (index) => {
    try {
      const container = suggestionsRef.current;
      const item = container?.querySelectorAll("[data-suggestion-item]")?.[index];
      if (item && container) item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      // intentionally ignore scroll errors
    }
  };

  const handleSelectSuggestion = (station) => {
    if (!station) return;
    const raw = station.coordinates?.coordinates;
    if (!raw || raw.length < 2) return;

    const lat = raw[1];
    const lng = raw[0];

    setZoomTo({ lat, lng });
    setSelectedStation({ ...station, lat, lng });
    setSearchTerm(station.name);
    setSuggestions([]);

    if (isMobile) {
      setShowMobileDrawer(true);
      setDrawerExpanded(true); // expand on explicit selection to enable booking
    }
  };

  const handleStationSelect = (station) => {
    const lat = station.lat ?? station.coordinates?.coordinates?.[1];
    const lng = station.lng ?? station.coordinates?.coordinates?.[0];

    if (!lat || !lng) return;

    setSelectedStation({ ...station, lat, lng });
    setZoomTo({ lat, lng });

    if (isMobile) {
      setShowMobileDrawer(true);
      // when tapping a pin, keep minimized to allow quick peek — user can expand
      setDrawerExpanded(false);
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
    setSearchTerm("");
    setSuggestions([]);
    document.body.style.overflow = "";
  };

  // Quick near-me toggle: sorts suggestions by distance when searching
  const toggleNearMe = () => {
    setNearMeMode((v) => !v);
    if (searchTerm) {
      setTimeout(() => handleSearchChange({ target: { value: searchTerm } }), 0);
    }
  };

  // Callback after booking completes — used to clear selection and close drawer (mobile)
  const handleBookingComplete = () => {
    // optionally clear map selection & close drawer
    setSelectedStation(null);
    setShowMobileDrawer(false);
    setDrawerExpanded(false);
    // you can also add any tracking / success toast here
  };

  return (
    <div className={styles.pageWrapper}>
      <Header />

      <div className={styles.container}>
        {/* Search Bar - Fixed on mobile */}
        <div className={`${styles.searchContainer} ${isMobile ? styles.searchContainerMobile : ""}`}>
          <div className={styles.searchBox} role="search" aria-label="Search stations">
            <Search size={20} className={styles.searchIcon} aria-hidden />

            <input
              type="text"
              inputMode="search"
              placeholder="Search for a station or location"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className={styles.searchInput}
              aria-autocomplete="list"
              aria-controls="station-suggestions"
              aria-activedescendant={highlightedIndex >= 0 ? `sug-${highlightedIndex}` : undefined}
            />

            {/* Near-me quick toggle: show only when we have user location available */}
            <button
              onClick={toggleNearMe}
              title={nearMeMode ? "Near me: ON" : "Near me: OFF"}
              aria-pressed={nearMeMode}
              className={`${styles.nearMeBtn} ${nearMeMode ? styles.nearMeBtnActive : ""}`}
            >
              <Navigation size={16} />
            </button>

            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSuggestions([]);
                }}
                className={styles.clearBtn}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {suggestions.length > 0 && (
            <div
              id="station-suggestions"
              ref={suggestionsRef}
              className={styles.suggestions}
              role="listbox"
              aria-label="Station suggestions"
            >
              {suggestions.map((station, idx) => (
                <div
                  key={station._id}
                  role="option"
                  id={`sug-${idx}`}
                  data-suggestion-item
                  aria-selected={highlightedIndex === idx}
                  onClick={() => handleSelectSuggestion(station)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`${styles.suggestionItem} ${highlightedIndex === idx ? styles.suggestionItemActive : ""}`}
                >
                  <MapPin size={18} className={styles.suggestionIcon} aria-hidden />
                  <div className={styles.suggestionText}>
                    <div className={styles.suggestionName}>{station.name}</div>
                    <div className={styles.suggestionLocation}>
                      {station.location}
                      {station._distanceKm != null && userLocRef.current && (
                        <span className={styles.distanceBadge}>{`${station._distanceKm.toFixed(1)} km`}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Map Section */}
          <div className={`${styles.mapSection} ${isMobile ? styles.mapSectionMobile : ""}`}>
            <InteractiveMap
              onStationSelect={(s) => handleStationSelect(s)}
              prefilledStation={selectedStation}
              zoomTo={zoomTo}
              theme="dark"
              onUserLocation={(loc) => handleUserLocationUpdate(loc)}
            />
          </div>

          {/* Desktop Form Sidebar */}
          {!isMobile && (
            <div className={styles.formSidebar}>
              {selectedStation ? (
                // pass the selectedStation to the booking form as `prefilledStation` and mode="map"
                <LuggageBookingForm
                  prefilledStation={selectedStation}
                  mode="map"
                  onBookingComplete={handleBookingComplete}
                  showHeader={false}
                  compact={true}
                />
              ) : (
                <div className={styles.placeholder}>
                  <Navigation size={48} color="var(--color-primary)" />
                  <h3 className={styles.placeholderTitle}>Select a Station</h3>
                  <p className={styles.placeholderText}>
                    Click on a pin on the map or search for a station to start your booking
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Bottom Drawer - Improved */}
        {isMobile && showMobileDrawer && selectedStation && (
          <>
            {/* Overlay - only when expanded */}
            {drawerExpanded && <div className={styles.overlay} onClick={() => setDrawerExpanded(false)} />}

            {/* Drawer */}
            <div className={`${styles.mobileDrawer} ${drawerExpanded ? styles.mobileDrawerExpanded : styles.mobileDrawerMinimized}`}>
              {/* Drawer Header - Always Visible */}
              <div className={styles.drawerHeader} onClick={toggleDrawer} role="button" aria-label="Toggle booking drawer">
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
                    <span className={styles.drawerToggleText}>{drawerExpanded ? "Minimize" : "Book Now"}</span>
                    <ChevronDown
                      size={20}
                      className={styles.drawerToggleIcon}
                      style={{
                        transform: drawerExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDrawer();
                  }}
                  className={styles.closeDrawerBtn}
                  aria-label="Close booking drawer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content - Scrollable */}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
