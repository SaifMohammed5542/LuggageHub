"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  Circle,
} from "@react-google-maps/api";
import { MapPin, Navigation2 } from "lucide-react";
import styles from "./InteractiveMap.module.css";

const libraries = ["places"];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Dark modern map style
const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b92a8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2d3748" }] },
  { featureType: "administrative.land_parcel", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#16213e" }] },
  { featureType: "poi", elementType: "labels.text", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#0f3460" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d3748" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4b5563" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2937" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#0f172a" }] },
];

// Light modern map style
const mapStyleLight = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "administrative.land_parcel", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#e8f5e9" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fafafa" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#c9d9e8" }] },
];

export default function InteractiveMap({ onStationSelect, prefilledStation, zoomTo, theme = "dark", stations: propStations }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    preventGoogleFontsLoading: true,
  });

  const [userLocation, setUserLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [showUserRadius] = useState(true);
  const [mapCenter, setMapCenter] = useState(null);
  const mapRef = useRef(null);

  // Fetch user location (but don't use it for initial map center)
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      () => {
        // Don't set userLocation if permission denied
        console.log("Location permission denied or unavailable");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Fetch stations if not provided via props
  useEffect(() => {
    if (propStations && propStations.length > 0) {
      setStations(propStations);
    } else {
      fetch("/api/station/list")
        .then((res) => res.json())
        .then((data) => setStations(data.stations || []))
        .catch((err) => console.error("Failed to fetch stations:", err));
    }
  }, [propStations]);

  // CRITICAL: Set initial map center based on zoomTo or default
  useEffect(() => {
    if (zoomTo) {
      setMapCenter(zoomTo);
    } else if (!mapCenter) {
      // Default to Melbourne CBD if no zoomTo and no center set
      setMapCenter({ lat: -37.8136, lng: 144.9631 });
    }
  }, [zoomTo]);

  // Handle zoom changes when zoomTo prop updates
  useEffect(() => {
    if (isLoaded && zoomTo && mapRef.current) {
      try {
        mapRef.current.panTo(zoomTo);
        mapRef.current.setZoom(14);
      } catch (e) {
        console.warn("panTo/setZoom failed:", e);
      }
    }
  }, [isLoaded, zoomTo]);

  useEffect(() => {
    if (prefilledStation) {
      setSelectedMarker(prefilledStation._id);
    }
  }, [prefilledStation]);

  if (loadError) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <MapPin size={48} color="var(--color-primary)" />
          <h3 className={styles.errorTitle}>Failed to load map</h3>
          <p className={styles.errorText}>Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  if (!isLoaded || !mapCenter) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading map...</p>
      </div>
    );
  }

  const calculateDistance = (user, station) => {
    if (!user || !station) return "N/A";
    const R = 6371;
    const dLat = (station.lat - user.lat) * (Math.PI / 180);
    const dLng = (station.lng - user.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(user.lat * (Math.PI / 180)) *
        Math.cos(station.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const createCustomMarkerIcon = (isSelected, isHovered) => {
    const size = isSelected ? 50 : isHovered ? 44 : 40;
    const color = isSelected ? "#667eea" : isHovered ? "#764ba2" : "#4c67f0";

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow${isSelected ? "-selected" : isHovered ? "-hover" : ""}">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.4"/>
          </filter>
        </defs>
        <circle cx="12" cy="12" r="8" fill="${color}" opacity="0.2"/>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              fill="${color}" filter="url(#shadow${isSelected ? "-selected" : isHovered ? "-hover" : ""})"/>
      </svg>
    `;

    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size),
    };
  };

  const createUserMarkerIcon = () => {
    const svg = `
      <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="userGrad">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#userGrad)" opacity="0.3"/>
        <circle cx="12" cy="12" r="6" fill="url(#userGrad)"/>
        <circle cx="12" cy="12" r="3" fill="white"/>
      </svg>
    `;

    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(28, 28),
      anchor: new window.google.maps.Point(14, 14),
    };
  };

  return (
    <div className={styles.mapWrapper}>
      <GoogleMap
        zoom={14}
        center={mapCenter}
        mapContainerClassName={styles.mapContainer}
        onLoad={(map) => (mapRef.current = map)}
        options={{
          styles: theme === "dark" ? mapStyle : mapStyleLight,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google?.maps?.ControlPosition?.RIGHT_CENTER,
          },
          gestureHandling: "greedy",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* User location marker with radius (only if location permission granted) */}
        {userLocation && (
          <>
            {showUserRadius && (
              <Circle
                center={userLocation}
                radius={2000}
                options={{
                  fillColor: "#667eea",
                  fillOpacity: 0.08,
                  strokeColor: "#667eea",
                  strokeOpacity: 0.3,
                  strokeWeight: 2,
                  clickable: false,
                }}
              />
            )}
            <Marker position={userLocation} icon={createUserMarkerIcon()} title="Your Location" zIndex={1000} />
          </>
        )}

        {/* Station markers */}
        {stations.map((station, idx) => {
          const raw = station?.coordinates?.coordinates;
          if (!raw || raw.length < 2) return null;

          const lng = Number(raw[0]);
          const lat = Number(raw[1]);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

          const isSelected = prefilledStation?._id === station._id || selectedMarker === station._id;
          const isHovered = hoveredMarker === station._id;
          const distance = calculateDistance(userLocation, { lat, lng });

          return (
            <Marker
              key={station._id || idx}
              position={{ lat, lng }}
              title={`${station.name}${distance !== "N/A" ? ` — ${distance} km` : ""}`}
              icon={createCustomMarkerIcon(isSelected, isHovered)}
              zIndex={isSelected ? 9999 : isHovered ? 100 : 50}
              onClick={() => {
                setSelectedMarker(station._id);
                onStationSelect({ ...station, lat, lng });
              }}
              onMouseOver={() => setHoveredMarker(station._id)}
              onMouseOut={() => setHoveredMarker(null)}
            />
          );
        })}
      </GoogleMap>

      {/* Custom controls overlay */}
      <div className={styles.controlsOverlay}>
        <button
          onClick={() => {
            if (userLocation && mapRef.current) {
              mapRef.current.panTo(userLocation);
              mapRef.current.setZoom(15);
            }
          }}
          className={styles.controlButton}
          title="Center on my location"
          disabled={!userLocation}
        >
          <Navigation2 size={20} />
        </button>
      </div>
    </div>
  );
}