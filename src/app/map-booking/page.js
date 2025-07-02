"use client";

import React, { useState, useEffect } from "react";
import InteractiveMap from "../../components/InteractiveMap";
import LuggageBookingForm from "../../components/LuggageBookingForm";
import GoogleMapsWrapper from "../../components/GoogleMapsWrapper";
import "../../../public/ALL CSS/MapBooking.css";
import { motion, AnimatePresence } from "framer-motion";

const MapBookingPage = () => {
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allStations, setAllStations] = useState([]);
  const [zoomTo, setZoomTo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [highlightedStationId, setHighlightedStationId] = useState(null);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await fetch("/api/station/list");
        const data = await res.json();
        setAllStations(data.stations || []);
      } catch (err) {
        console.error("Error fetching stations for search:", err);
      }
    };

    fetchStations();

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchTerm(input);
    if (input.trim().length > 0) {
      const filtered = allStations
        .filter((station) =>
          station.name.toLowerCase().includes(input.toLowerCase())
        )
        .slice(0, 3);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (station) => {
    const lat = station.coordinates.coordinates[1];
    const lng = station.coordinates.coordinates[0];
    setZoomTo({ lat, lng });
    setHighlightedStationId(station._id);
    setSearchTerm(station.name);
    setSuggestions([]);
    // Do NOT open the form on suggestion click
  };

  const handleStationSelect = (station) => {
    const lat = station.coordinates.coordinates[1];
    const lng = station.coordinates.coordinates[0];
    setSelectedStation({ ...station, lat, lng });
    setZoomTo({ lat, lng });
    setHighlightedStationId(station._id);
    if (isMobile) setShowDrawer(true);
  };

  return (
    <GoogleMapsWrapper>
      <div className="map-booking-wrapper">
        <div className="map-container">
          <div className="station-search-bar">
            <input
              type="text"
              placeholder="Search station name..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((s) => (
                  <li key={s._id} onClick={() => handleSelectSuggestion(s)}>
                    {s.name} ({s.location})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <InteractiveMap
            onStationSelect={handleStationSelect}
            prefilledStation={selectedStation}
            searchTerm={searchTerm}
            zoomTo={zoomTo}
            highlightId={highlightedStationId}
          />
        </div>

        {!isMobile && (
          <div className="form-container desktop-only always-visible">
            <LuggageBookingForm prefilledStation={selectedStation} />
          </div>
        )}

        <AnimatePresence>
          {isMobile && showDrawer && (
            <motion.div
              className="form-drawer"
              initial={{ y: "100%" }}
              animate={{ y: "5%" }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.4 }}
            >
              <button className="close-button" onClick={() => setShowDrawer(false)}>
                ❌
              </button>
              <LuggageBookingForm prefilledStation={selectedStation} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GoogleMapsWrapper>
  );
};

export default MapBookingPage;
