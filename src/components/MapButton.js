import React, { useState } from 'react';
import MapWithDirections from '../components/Map.js';

const MapButton = () => {
  const [origin, setOrigin] = useState(null);

  const handleButtonClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setOrigin({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error(error)
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div>
      <h1>Find the Luggage Storage nearest to you</h1>
      <button onClick={handleButtonClick}>Find Luggage Storage</button>
      {origin && <MapWithDirections origin={origin} />}
    </div>
  );
};

export default MapButton;
