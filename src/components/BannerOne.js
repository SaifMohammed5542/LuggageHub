"use client";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSuitcaseRolling, faKey, faMapMarkerAlt, faDirections } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import { useState } from "react";
import "../../public/ALL CSS/BannerTwo.css";

function BannerOne() {
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loadingNavigation, setLoadingNavigation] = useState(false);
  const [loadingNearest, setLoadingNearest] = useState(false);
  const [showStations, setShowStations] = useState(false);

  const handleNavigation = (path) => {
    setLoadingNavigation(true);
    router.push(path);
  };

  const findNearestStorage = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoadingNearest(true);

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const res = await fetch('/api/station/nearest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude })
        });

        const data = await res.json();
        console.log("Nearest Storages:", data);

        if (data.length > 0) {
          setStations(data);
          setShowStations(true);
        } else {
          alert("No nearby stations found.");
        }
      } catch (error) {
        console.error("Error fetching nearest stations:", error);
        alert("Error fetching nearest stations");
      } finally {
        setLoadingNearest(false);
      }
    }, () => {
      alert("Unable to retrieve your location");
      setLoadingNearest(false);
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
      <video className="background-video" autoPlay muted loop playsInline>
        <source src="/Videos/walkvid.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="hero-content">
        <div className="text-content">
          <h2>Trusted Luggage Storage Near You.</h2>
          <p>Find Secure Luggage Storage Near You</p>

          <button className="cta-btn neon-glow" onClick={() => handleNavigation("/booking-form")}>
            Book Your Luggage! <FontAwesomeIcon icon={faSuitcaseRolling} />
          </button>

          <button className="cta-btn neon-glow1" onClick={() => handleNavigation("/key-handover")}>
            Drop Your Key! <FontAwesomeIcon icon={faKey} />
          </button>

          <br />

          <button className="nearbtn" onClick={findNearestStorage}>
            Find Nearest Storage <FontAwesomeIcon icon={faMapMarkerAlt} />
            {loadingNearest && <span className="button-spinner" />}
          </button>

          {showStations && stations.length > 0 && (
            <div className="station-list">
              <h3>Nearest Storage Locations:</h3>
              <ul>
                {stations.map((station, index) => (
                  <li key={index}>
                    <strong>{station.name}</strong> - {station.location}
                    <br />
                    <button onClick={() => handleStationClick(station)} className="directions-btn">
                      View Directions <FontAwesomeIcon icon={faDirections} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="image-content">
          <Image src="/images/Lone bag.png" alt="luggage storage" width={550} height={300} className="glowing-image" />
        </div>
      </div>
    </section>
  );
}

export default BannerOne;
