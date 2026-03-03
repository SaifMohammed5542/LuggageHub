"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./Banner.module.css";
import BookingDrawer from "@/components/BookingDrawer/BookingDrawer";

export default function Banner() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [locationChips, setLocationChips] = useState([]);
const [userCoords,    setUserCoords]    = useState(null);
const [initialSearch, setInitialSearch] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
  (async () => {
    try {
      const res  = await fetch("/api/station/list");
      const data = await res.json();
      const list = data.stations || [];
      const chipMap = new Map();
      list.forEach(s => {
        const coords = s.coordinates?.coordinates;
        if (!coords) return;
        const [lon, lat] = coords;
        if (s.suburb && s.city) {
          const label = `${s.suburb}, ${s.city}`;
          if (!chipMap.has(label)) chipMap.set(label, { label, lat, lon });
        } else if (s.city) {
          if (!chipMap.has(s.city)) chipMap.set(s.city, { label: s.city, lat, lon });
        }
      });
      setLocationChips([...chipMap.values()].slice(0, 4));
    } catch {}
  })();
}, []);

useEffect(() => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => setUserCoords(pos.coords),
    () => {}
  );
}, []);

const openWithChip = (chip) => { setInitialSearch(chip); setDrawerOpen(true); };
const openDrawer   = ()     => { setInitialSearch(null); setDrawerOpen(true); };

  return (
    <>
      <section className={styles.banner}>
        {/* Texture & ambient glows */}
        <div className={styles.dots} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <div className={styles.nav}>
          <div className={styles.navBrand}>
            <div className={styles.navIcon}>🧳</div>
            <span className={styles.navName}>LuggageTerminal</span>
          </div>
          <a href="/booking-form" className={styles.navLink}>
            Direct Booking →
          </a>
        </div>

        {/* ── Left: Hero copy ──────────────────────────────────────────── */}
        <div className={`${styles.hero} ${visible ? styles.heroIn : ""}`}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Trusted by 5,000+ travellers
          </div>

          <h1 className={styles.heading}>
            Store Your{" "}
            <span className={styles.accent}>Luggage</span>
            {" "}&amp; Explore Free
          </h1>

          <p className={styles.sub}>
            Verified storage spots near you. Drop off in minutes, explore freely.
            From A$3.99/day.
          </p>

          {/* Price chips */}
          <div className={styles.prices}>
            {[
              { emoji: "🎒", label: "Small bag",        price: "A$3.99" },
              { emoji: "🧳", label: "Large / Suitcase", price: "A$8.49" },
            ].map((p) => (
              <div key={p.label} className={styles.priceChip}>
                <span className={styles.priceChipEmoji}>{p.emoji}</span>
                <div>
                  <div className={styles.priceChipLabel}>{p.label}</div>
                  <div className={styles.priceChipAmt}>
                    {p.price}
                    <span className={styles.priceChipPer}>/day</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button onClick={openDrawer} className={styles.cta}>
            <span>Find Storage Near Me</span>
            <span className={styles.ctaArrow}>→</span>
          </button>

          {locationChips.length > 0 && (
  <div className={styles.locationChipsWrap}>
    <span className={styles.locationChipsLabel}>
      {userCoords ? "📍 Near you" : "⭐ Popular locations"}
    </span>
    <div className={styles.locationChips}>
      {locationChips.map((chip, i) => (
        <button key={i} type="button" className={styles.locationChip} onClick={() => openWithChip(chip)}>
          {chip.label}
        </button>
      ))}
    </div>
  </div>
)}

          {/* Stats */}
          {/* <div className={styles.stats}>
            {[
              ["5K+",  "Travellers"],
              ["4.8★", "Rating"],
              ["60s",  "To book"],
              ["A$2K", "Insured"],
            ].map(([v, l]) => (
              <div key={l} className={styles.stat}>
                <div className={styles.statVal}>{v}</div>
                <div className={styles.statLbl}>{l}</div>
              </div>
            ))}
          </div> */}
        </div>

        {/* ── Right panel: desktop only ─────────────────────────────────── */}
        <div className={`${styles.rightPanel} ${visible ? styles.rightPanelIn : ""}`}>
          {/* Luggage image */}
          <div className={styles.imgWrap}>
            <Image
              src="/images/Glowedwhite.png"
              alt="Secure Luggage Storage"
              width={220}
              height={180}
              priority
              className={styles.luggageImg}
            />
          </div>

          {/* Trust cards 2×2 */}
          <div className={styles.trustGrid}>
            {[
              { icon: "🔐", title: "A$2,000 Insured",   sub: "Every bag covered" },
              { icon: "⚡", title: "Book in 60 seconds", sub: "Instant QR code" },
              { icon: "✓",  title: "Verified Locations", sub: "All sites checked" },
              { icon: "📱", title: "24/7 Support",       sub: "Always here" },
            ].map((c) => (
              <div key={c.title} className={styles.trustCard}>
                <span className={styles.trustCardIcon}>{c.icon}</span>
                <div>
                  <div className={styles.trustCardTitle}>{c.title}</div>
                  <div className={styles.trustCardSub}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile trust section — hidden on desktop */}
      <section className={styles.mobileTrust}>
        <div className={styles.mobileTrustGrid}>
          {[
            { icon: "🔐", title: "A$2,000 Insured",   sub: "Every bag fully covered" },
            { icon: "⚡", title: "Book in 60 seconds", sub: "Instant confirmation" },
            { icon: "✓",  title: "Verified Locations", sub: "All sites inspected" },
            { icon: "📱", title: "24/7 Support",       sub: "Always here to help" },
          ].map((c) => (
            <div key={c.title} className={styles.mobileTrustCard}>
              <div className={styles.mobileTrustIcon}>{c.icon}</div>
              <div className={styles.mobileTrustTitle}>{c.title}</div>
              <div className={styles.mobileTrustSub}>{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

<BookingDrawer
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  onOpen={() => setDrawerOpen(true)}
  initialSearch={initialSearch}
/></>
  );
}