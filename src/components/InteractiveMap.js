"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c9b2a6" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#dfd2ae" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: "#a5b076" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f5f1e6" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#fdfcf8" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#f8c967" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ color: "#dfd2ae" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#b9d3c2" }],
  },
];

const mapContainerStyle = {
  width: "100%",
  height: "100vh",
};

const InteractiveMap = ({ onStationSelect, prefilledStation, zoomTo }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        const res = await fetch("/api/station/nearest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude }),
        });

        const data = await res.json();
        setStations(Array.isArray(data) ? data : []);
      },
      (err) => console.error("Location error", err),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (zoomTo && mapRef.current) {
      mapRef.current.panTo(zoomTo);
      mapRef.current.setZoom(17);
    }
  }, [zoomTo]);

  const calculateDistance = (user, station) => {
    const R = 6371;
    const dLat = (station.lat - user.lat) * (Math.PI / 180);
    const dLng = (station.lng - user.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(user.lat * (Math.PI / 180)) *
        Math.cos(station.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  return (
    <GoogleMap
      zoom={14}
      center={userLocation || { lat: -37.8136, lng: 144.9631 }}
      mapContainerStyle={mapContainerStyle}
      options={{
        styles: mapStyle,
        disableDefaultUI: false,
        zoomControl: true,
        minZoom: 3,
        maxZoom: 20,
      }}
      onLoad={(map) => (mapRef.current = map)}
    >
      {userLocation && (
        <Marker position={userLocation} title="You are here" />
      )}

      {stations.map((station, idx) => {
        const lat = station.coordinates.coordinates[1];
        const lng = station.coordinates.coordinates[0];
        const isHighlighted =
          prefilledStation &&
          prefilledStation._id === station._id &&
          prefilledStation.highlight;

        return (
          <Marker
            key={idx}
            position={{ lat, lng }}
            icon={{
              url: "/icons/station-pin.png",
              scaledSize: new window.google.maps.Size(
                isHighlighted ? 80 : 60,
                isHighlighted ? 80 : 60
              ),
            }}
            onClick={() => {
              setSelectedMarker(station._id);
              onStationSelect({ ...station, lat, lng });
            }}
          >
            {selectedMarker === station._id && (
              <InfoWindow position={{ lat, lng }}>
                <div className="custom-info-window">
                  <strong>{station.name}</strong>
                  <br />
                  {station.location}
                  <br />
                  <span className="distance">
                    Distance: {calculateDistance(userLocation, { lat, lng })} km
                  </span>
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </GoogleMap>
  );
};

export default InteractiveMap;
