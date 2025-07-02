"use client";
import React, { useState, useEffect } from 'react';
import { Luggage, Key, MapPin, Navigation, Loader, ChevronUp, PackageSearch } from 'lucide-react'; // Added ChevronUp
import '../../public/ALL CSS/BannerOne.css'

const BannerOne = () => {
    const [stations, setStations] = useState([]);
    const [loadingNearest, setLoadingNearest] = useState(false);
    const [showStations, setShowStations] = useState(false);
    const [showTopButton, setShowTopButton] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);

        const handleScroll = () => {
            setShowTopButton(window.scrollY > 300);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleNavigation = (path) => {
        console.log(`Navigating to: ${path}`);
        window.location.href = path;
    };

    const findNearestStorage = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser. Please enable it to find nearest storage.");
            return;
        }

        setLoadingNearest(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    const res = await fetch('/api/station/nearest', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude })
                    });

                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }

                    const data = await res.json();
                    console.log("Nearest Storages:", data);

                    if (data && data.length > 0) {
                        setStations(data);
                        setShowStations(true);
                    } else {
                        alert("No nearby stations found. Try again later or adjust your location settings.");
                        setStations([]);
                        setShowStations(false);
                    }
                } catch (error) {
                    console.error("Error fetching nearest stations:", error);
                    alert("Error fetching nearest stations. Please try again.");
                    setStations([]);
                    setShowStations(false);
                } finally {
                    setLoadingNearest(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMessage = "Unable to retrieve your location.";
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = "Location access denied. Please enable location services in your browser settings.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = "Location information is unavailable.";
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = "The request to get user location timed out.";
                }
                alert(errorMessage);
                setLoadingNearest(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleStationClick = (station) => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser. Cannot get directions.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLatitude = position.coords.latitude;
                const userLongitude = position.coords.longitude;

                // Ensure station coordinates are correctly ordered as [longitude, latitude] from your schema
                const stationLongitude = station.coordinates.coordinates[0];
                const stationLatitude = station.coordinates.coordinates[1];

                // Correct Google Maps URL format for directions
                const mapsUrl = `https://www.google.com/maps/dir/${userLatitude},${userLongitude}/${stationLatitude},${stationLongitude}`;
                window.open(mapsUrl, '_blank');
            },
            (error) => {
                console.error("Geolocation error for directions:", error);
                alert("Unable to fetch your current location for directions. Please ensure location services are enabled.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className="container">
            {/* Animated background patterns */}
            <div className="backgroundOverlay">
                <div className="backgroundBlob1"></div>
                <div className="backgroundBlob2"></div>
            </div>

            {/* Grid pattern overlay */}
            <div className="patternOverlay"></div>

            {/* Main content */}
            <div className="mainContent">
                <div className="contentWrapper">
                    <div className="gridContainer">

                        {/* Left content */}
                        <div className={`leftContent ${isVisible ? 'visible' : 'hidden-left'}`}>
                            <div className="contentSection">
                                <div className="badge">
                                    <span className="badgeText">✨ Trusted Storage Solutions</span>
                                </div>

                                <h1 className="mainHeading">
                                    Secure Your
                                    <br />
                                    <span className="gradientText">Luggage</span>{' '}
                                    Anywhere
                                </h1>

                                <p className="subtitle">
                                    Find trusted luggage storage locations near you. Safe, secure, and available 24/7 wherever your journey takes you.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="buttonContainer">
                                <button
                                    onClick={() => handleNavigation("/map-booking")}
                                    className="primaryButton"
                                >
                                    <PackageSearch className="buttonIcon" />
                                    <span>Find & Book Nearest Storage</span>
                                </button>
                                
                                 <button
                                    onClick={() => handleNavigation("/direct-booking")}
                                    className="primaryButton"
                                >
                                    <Luggage className="buttonIcon" />
                                    <span>Direct Booking</span>
                                </button>


                                <button
                                    onClick={() => handleNavigation("/key-handover")}
                                    className="secondaryButton"
                                >
                                    <Key className="buttonIcon" />
                                    <span>Drop Your Key</span>
                                </button>
                            </div>

                            {/* Find nearest button */}
                            <button
                                onClick={findNearestStorage}
                                disabled={loadingNearest}
                                className={`nearestButton ${loadingNearest ? 'loading' : ''}`}
                            >
                                {loadingNearest ? (
                                    <Loader className="buttonIcon spin" />
                                ) : (
                                    <MapPin className="buttonIcon" />
                                )}
                                <span>{loadingNearest ? 'Finding...' : 'Directions to Nearest Storage'}</span>
                            </button>

                            {/* Station list */}
                            {showStations && stations.length > 0 && (
                                <div className="stationList">
                                    <h3 className="stationHeading">
                                        <MapPin className="stationIcon" />
                                        <span>Nearest Storage Locations</span>
                                    </h3>
                                    <div className="stationContainer">
                                        {stations.map((station, index) => (
                                            <div key={index} className="stationItem">
                                                <div className="stationInfo">
                                                    <div>
                                                        <h4 className="stationName">{station.name}</h4>
                                                        <p className="stationLocation">{station.location}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleStationClick(station)}
                                                        className="directionsButton"
                                                    >
                                                        <Navigation className="directionIcon" />
                                                        <span>Directions</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right content - Visual */}
                        <div className={`rightContent ${isVisible ? 'visible' : 'hidden-right'}`}>
                            <div className="visualContainer">
                                {/* Floating elements */}
                                <div className="floatingElement1"></div>
                                <div className="floatingElement2"></div>

                                {/* Main visual */}
                                <div className="mainVisual">
                                    <div className="visualContent">
                                        <div className="iconContainer">
                                            <Luggage className="mainIcon" />
                                        </div>
                                        <h3 className="visualHeading">24/7 Secure Storage</h3>
                                        <p className="visualSubtext">Your belongings are safe with our verified storage partners</p>
                                        <div className="featureGrid">
                                            <div className="featureItem">
                                                <div className="featureIcon">🔒</div>
                                                <p className="featureText">Secure</p>
                                            </div>
                                            <div className="featureItem">
                                                <div className="featureIcon">📍</div>
                                                <p className="featureText">Nearby</p>
                                            </div>
                                            <div className="featureItem">
                                                <div className="featureIcon">⚡</div>
                                                <p className="featureText">Instant</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll to top button - UNCOMMENTED AND USING CLASSES */}
            {showTopButton && (
                <button
                    onClick={scrollToTop}
                    className="scrollToTopButton" // Using a class name
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                    <ChevronUp className="scrollToTopIcon" /> {/* Using a class name */}
                </button>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }

                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(5deg); }
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .animate-float-delayed {
                    animation: float-delayed 8s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default BannerOne;