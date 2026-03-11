"use client";
// hooks/useWalkingTime.js
// Requests user location once, provides walking time to any station coords
// Uses Haversine straight-line distance, 1km ≈ 12 min walking

import { useState, useEffect } from 'react';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns "8 min walk", "1.2km · 15 min walk", or "--" if no location
export function getWalkingTime(userLocation, stationLat, stationLon) {
  if (!userLocation || stationLat == null || stationLon == null) return '--';
  const km = haversineKm(userLocation.lat, userLocation.lon, stationLat, stationLon);
  const mins = Math.round((km / 5) * 60); // 5km/h walking speed
  const distStr = km < 1
    ? `${Math.round(km * 1000)}m`
    : `${km.toFixed(1)}km`;
  return `${distStr} · ${mins} min walk`;
}

// Hook — call once at page level, pass userLocation down to cards
export function useUserLocation() {
  const [userLocation, setUserLocation] = useState(null); // { lat, lon } or null

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setUserLocation(null), // denied or error — stays null
      { timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  return userLocation;
}