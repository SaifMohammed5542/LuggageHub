"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Luggage,
  Key,
  MapPin,
  Navigation,
  Loader,
  ChevronUp,
  PackageSearch,
} from "lucide-react";
import styles from "./Banner.module.css";
import Image from "next/image";

export default function Banner() {
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loadingNearest, setLoadingNearest] = useState(false);
  const [showStations, setShowStations] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navigate = (path) => router.push(path);

  const findNearest = () => {
    if (!navigator?.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setLoadingNearest(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch("/api/station/nearest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length) {
            setStations(data);
            setShowStations(true);
          } else {
            setStations([]);
            setShowStations(false);
            alert("No nearby stations found.");
          }
        } catch (e) {
          console.error(e);
          alert("Error fetching nearest stations.");
          setStations([]);
          setShowStations(false);
        } finally {
          setLoadingNearest(false);
        }
      },
      (err) => {
        console.error(err);
        let msg = "Unable to retrieve your location.";
        if (err.code === err.PERMISSION_DENIED) msg = "Location access denied. Enable it in your browser settings.";
        if (err.code === err.POSITION_UNAVAILABLE) msg = "Location info unavailable.";
        if (err.code === err.TIMEOUT) msg = "Location request timed out.";
        alert(msg);
        setLoadingNearest(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const openDirections = (station) => {
    if (!navigator?.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        const sLng = station?.coordinates?.coordinates?.[0];
        const sLat = station?.coordinates?.coordinates?.[1];
        if (typeof sLat !== "number" || typeof sLng !== "number") return;
        const url = `https://www.google.com/maps/dir/${uLat},${uLng}/${sLat},${sLng}`;
        window.open(url, "_blank");
      },
      () => alert("Unable to fetch your current location for directions."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <section className={styles.banner}>
      {/* Decorative layers */}
      <div className={styles.background} aria-hidden />
      <div className={styles.pattern} aria-hidden />
      <div className={styles.blobOne} aria-hidden />
      <div className={styles.blobTwo} aria-hidden />

      <div className={styles.content}>
        <div className={styles.wrapper}>
          <div className={styles.grid}>
            {/* LEFT COLUMN */}
            <div className={`${styles.left} ${visible ? styles.show : ""}`}>
              <div className={styles.intro}>
                <div className={styles.textImageRow}>
                  <div className={styles.text}>
                    <div className={styles.badge}>
                      <span>✨ New • Faster • Safer</span>
                    </div>
                    <h1 className={styles.heading}>
                      Secure Your<br />
                      <span className={styles.gradient}>Luggage</span> <br />
                      Anywhere
                    </h1>
                  </div>

                  <div className={styles.imageBox}>
                    <Image
                      src="/images/GlowBag.png"
                      alt="Logo"
                      width={340}
                      height={340}
                      priority
                      sizes="(max-width: 768px) 28vw, 240px"
                      className={styles.logo}
                    />
                  </div>
                </div>

                <p className={styles.subtitle}>
                  Instantly find secure storage near you and keep moving.
                  Warm, human, and always open.
                </p>
              </div>

              <div className={styles.actions}>
                <button onClick={() => navigate("/map-booking")} className={styles.primaryBtn}>
                  <PackageSearch className={styles.icon} />
                  <span>Find & Book</span>
                </button>

                <button onClick={() => navigate("/booking-form")} className={styles.secondaryBtn}>
                  <Luggage className={styles.icon} />
                  <span>Book Now</span>
                </button>

                <button onClick={() => navigate("/key-handover")} className={`${styles.secondaryBtn} ${styles.glassBtn}`}>
                  <Key className={styles.icon} />
                  <span>Drop Your Key</span>
                </button>
              </div>

              <button
                onClick={findNearest}
                disabled={loadingNearest}
                className={`${styles.nearestBtn} ${loadingNearest ? styles.loading : ""}`}
              >
                {loadingNearest ? (
                  <Loader className={`${styles.icon} ${styles.spin}`} />
                ) : (
                  <MapPin className={styles.icon} />
                )}
                <span>{loadingNearest ? "Finding..." : "Directions to Nearest"}</span>
              </button>

              {showStations && stations.length > 0 && (
                <div className={styles.stationList}>
                  <h3 className={styles.stationHeading}>
                    <MapPin className={styles.stationIcon} />
                    <span>Nearest Storage</span>
                  </h3>
                  <div className={styles.stationGrid}>
                    {stations.map((s, i) => (
                      <div key={s._id ?? i} className={styles.stationCard}>
                        <div className={styles.stationInfo}>
                          <div>
                            <h4 className={styles.stationName}>{s.name}</h4>
                            <p className={styles.stationLocation}>{s.location}</p>
                          </div>
                          <button
                            onClick={() => openDirections(s)}
                            className={`${styles.secondaryBtn} ${styles.glassBtn}`}
                          >
                            <Navigation className={styles.directionIcon} />
                            <span>Directions</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className={`${styles.right} ${visible ? styles.show : ""}`}>
              <div className={styles.visualBox}>
                <div className={styles.iconBox}>
                  <Luggage className={styles.mainIcon} />
                </div>
                <h3 className={styles.visualTitle}>24/7 Secure Storage</h3>
                <p className={styles.visualText}>Insurance-backed partners. Tap to book in seconds.</p>
                <div className={styles.featureGrid}>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>🔐</div><p>Verified partners</p>
                  </div>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>🚶‍♂️</div><p>Walkable locations</p>
                  </div>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>⚡</div><p>Instant confirm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showScrollTop && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className={styles.scrollTop}
            >
              <ChevronUp className={styles.scrollTopIcon} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}