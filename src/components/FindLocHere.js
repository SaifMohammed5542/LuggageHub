import React, { useState, useRef, useEffect } from "react";
import '../../public/ALL CSS/FindLocHere.css';

const FindLocHere = ({ destination }) => {
  const [startLocation, setStartLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const MAPBOX_TOKEN = 'pk.eyJ1IjoibHVnZ2FnZS1zdG9yYWdlLW9ubGluZSIsImEiOiJjbThmY21tenUwY2h3MmtzNWw2b3lkNHVuIn0.Wi8il3EK0vURIwYZO2uMaA'; // Replace with your token

  const handleInputChange = async (e) => {
    const inputValue = e.target.value;
    setStartLocation(inputValue);

    if (inputValue.length > 2) {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            inputValue
          )}.json?access_token=${MAPBOX_TOKEN}&country=au&proximity=144.9631,-37.8136`
        );
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) {
        console.error("Error fetching Mapbox geocoding data:", error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setStartLocation(suggestion.place_name);
    setSuggestions([]);
  };

  const handleOpenDirections = () => {
    setMessage("Currently, we are available at only one location.");

    setTimeout(() => {
      setMessage("");
      if (startLocation) {
        window.open(
          `https://www.google.com/maps/dir/?api=1&origin=$?q=${encodeURIComponent(
            startLocation
          )}&destination=${encodeURIComponent(destination)}`,
          "_blank"
        );
      }
    }, 1500);
  };

  return (
    <div className="Find">
      <div className="Find-text">
        <h1>Find nearest storage</h1>
      </div>
      <div className="Find-input">
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter your location"
          value={startLocation}
          onChange={handleInputChange}
        />
        <button onClick={handleOpenDirections}>
          Get Directions ➔
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.place_name}
            </li>
          ))}
        </ul>
      )}
      {message && <div className="message">{message}</div>}
    </div>
  );
};

export default FindLocHere;