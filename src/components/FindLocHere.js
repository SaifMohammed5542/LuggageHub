import React, { useState } from "react";
import '../../public/ALL CSS/FindLocHere.css';

const FindLocHere = ({ destination }) => {
  const [startLocation, setStartLocation] = useState("");

  const handleOpenDirections = () => {
    if (startLocation) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
          startLocation
        )}&destination=${encodeURIComponent(destination)}`,
        "_blank"
      );
    }
  };

  return (
    <div className="Find">
        {/* <div className="Find-text">
            <h1>Enter your location to find the nearest storage facility.</h1>
        </div> */}
        <div className="Find-input">
            <input
            type="text"
            placeholder="Enter starting location"
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
            />
            {/* <br/> */}
            <button onClick={handleOpenDirections}>
                Get Directions ➔
            </button>
        </div>
    </div>
  );
};

export default FindLocHere;
