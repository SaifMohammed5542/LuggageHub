"use client";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { useState } from "react";
// import FindLocHere from "../components/FindLocHere";
import "../../public/ALL CSS/BannerTwo.css";

function BannerOne() {
  const router = useRouter();
  const [stations, setStations] = useState([]);  // State to store stations data
  const [loading, setLoading] = useState(false); // State to track loading state
  const [showStations, setShowStations] = useState(false); // State to toggle station list visibility

  const findNearestStorage = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);  // Set loading to true while fetching

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const res = await fetch('/api/station/nearest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude })
        });

        const data = await res.json();
        console.log("Nearest Storages:", data);  // Log the stations found

        if (data.length > 0) {
          setStations(data);  // Store stations in state
          setShowStations(true);  // Show stations list
        } else {
          alert("No nearby stations found.");
        }

      } catch (error) {
        console.error("Error fetching nearest stations:", error);
        alert("Error fetching nearest stations");
      } finally {
        setLoading(false);  // Set loading to false after request completes
      }
    }, () => {
      alert("Unable to retrieve your location");
      setLoading(false);  // Set loading to false if geolocation fails
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const handleStationClick = (station) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const origin = `${position.coords.latitude},${position.coords.longitude}`;
      const destination = `${station.coordinates.coordinates[1]},${station.coordinates.coordinates[0]}`;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
      window.open(mapsUrl, '_blank');
    }, () => {
      alert("Unable to fetch your current location for directions.");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  return (
    <section id="home" className="hero">
      {/* Background Video */}
      <video className="background-video" autoPlay muted loop playsInline>

        <source src="/Videos/walkvid.mp4" type="video/mp4" />
          Your browser does not support the video tag.
          </video>
      <div className="hero-content">
        <div className="text-content">
          <h2>Travel Light, Store Right!</h2>
          <p>Find Secure Luggage Storage Near You</p>
          <button className="cta-btn neon-glow" onClick={() => router.push("/booking-form")}>Book Now!</button>

          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          />

          {/* <FindLocHere destination={"EzyMart, Melbourne"} /> */}
          <br/>
          <button className="nearbtn" onClick={findNearestStorage}>Find Nearest Storage</button>

          {/* Loading State */}
          {loading && <p>Loading nearest stations...</p>}

          {/* Display Stations */}
          {showStations && stations.length > 0 && (
            <div className="station-list">
              <h3>Nearest Storage Locations:</h3>
              <ul>
                {stations.map((station, index) => (
                  <li key={index}>
                    <strong>{station.name}</strong> - {station.location}
                    <br />
                    <button onClick={() => handleStationClick(station)} className="directions-btn">
                      View Directions
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="image-content">
          <Image src="/images/Lone bag.png" alt="luggage storage" width={500} height={300} className="glowing-image" />
        </div>
      </div>
    </section>
  );
}

export default BannerOne;
