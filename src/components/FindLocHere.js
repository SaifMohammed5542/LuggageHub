import React, { useState } from "react";
import '../../public/ALL CSS/FindLocHere.css';

const FindLocHere = ({ destination }) => {
  const [startLocation, setStartLocation] = useState("");
  const [message, setMessage] = useState("");

  const handleOpenDirections = () => {
    setMessage("Currently, we are available at only one location.");

    setTimeout(() => {
      setMessage(""); // Clear message after 3 seconds
      if (startLocation) {
        window.open(
          `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
            startLocation
          )}&destination=${encodeURIComponent(destination)}`,
          "_blank"
        );
      }
    }, 3000);
  };

  return (
    <div className="Find">
        <div className="Find-text">
            <h1>Find nearest storage</h1>
        </div>
        <div className="Find-input">
            <input
            type="text"
            placeholder="Enter your location"
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
            />
            <button onClick={handleOpenDirections}>
                Get Directions ➔
            </button>
        </div>

        {/* Message Display */}
        {message && <div className="message">{message}</div>}
    </div>
  );
};

export default FindLocHere;
