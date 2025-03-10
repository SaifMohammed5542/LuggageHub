"use client";

import { GoogleMap, LoadScript, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { useState } from "react";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const destination = { lat: 28.7041, lng: 77.1025 }; // Replace with your location (Latitude & Longitude)

const GoogleMapComponent = () => {
  const [response, setResponse] = useState(null);
  
  const handleDirections = (result, status) => {
    if (status === "OK") {
      setResponse(result);
    } else {
      console.error("Directions request failed due to " + status);
    }
  };

  return (
    <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
      <GoogleMap mapContainerStyle={containerStyle} center={destination} zoom={14}>
        <DirectionsService
          options={{
            destination,
            origin: "current-location", // Will be replaced by user's location
            travelMode: "DRIVING",
          }}
          callback={handleDirections}
        />
        {response && <DirectionsRenderer directions={response} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default GoogleMapComponent;
