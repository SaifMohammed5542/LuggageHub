// import React from "react";
// import { useState } from "react";
// const GoogleMaps = ({ destination }) => {
//     const [startLocation, setStartLocation] = useState("");
  
//     const handleOpenDirections = () => {
//       if (startLocation) {
//         window.open(
//           `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
//             startLocation
//           )}&destination=${encodeURIComponent(destination)}`,
//           "_blank"
//         );
//       }
//     };
  
//     return (
//       <div style={{ textAlign: "start" }}>
//         <input
//           type="text"
//           placeholder="Enter starting location"
//           value={startLocation}
//           onChange={(e) => setStartLocation(e.target.value)}
//           style={{ marginBottom: "10px", padding: "5px", width: "250px" }}
//         />
//         <button onClick={handleOpenDirections} style={{ marginLeft: "10px", padding: "5px 10px" }}>
//           Get Directions
//         </button>
//       </div>
//     );
//   };
  
//   export default GoogleMaps;
  
import React, { useState } from "react";

const GoogleMapDirections = ({ destination }) => {
  const [startLocation, setStartLocation] = useState("");

  const handleChange = (e) => {
    setStartLocation(e.target.value);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <input
        type="text"
        placeholder="Enter starting location"
        value={startLocation}
        onChange={handleChange}
        style={{ marginBottom: "10px", padding: "5px", width: "250px" }}
      />
      <div style={{ position: "relative", textAlign: "right", width: "600px", height: "400px" }}>
        <div style={{ overflow: "hidden", background: "none", width: "600px", height: "400px" }}>
          {startLocation ? (
            <iframe
              title="Google Map Directions"
              src={`https://www.google.com/maps/embed/v1/directions?key="AlzaSyAl6rfSekQnedCsITgNtyq2v1jblozWA0o"&origin=${encodeURIComponent(
                startLocation
              )}&destination=${encodeURIComponent(destination)}&mode=driving`}
              style={{ width: "600px", height: "400px", border: "none" }}
              allowFullScreen
              loading="lazy"
            ></iframe>
          ) : (
            <p>Enter a starting location to see directions.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleMapDirections;
