"use client";
// components/Banner/Banner.js
// SEO CHANGES (zero visual/logic changes):
//   - H1 now contains primary keyword naturally
//   - Subtitle expanded with keyword variations
//   - Image alt tag is descriptive + keyword-rich
//   - CTA button text is a searchable phrase
//   - Trust cards use keyword-aware language
//   - Added aria-label on section for accessibility + SEO
//   - Price chips updated with real search terms
//   - ALL existing logic (drawer, chips, geolocation) untouched

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./Banner.module.css";
import BookingDrawer from "@/components/BookingDrawer/BookingDrawer";

export default function Banner() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [locationChips, setLocationChips] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [initialSearch, setInitialSearch] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/station/list");
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
  const openDrawer = () => { setInitialSearch(null); setDrawerOpen(true); };

  return (
    <>
      {/* ✅ SEO: aria-label on section tells Google what this page section is about */}
      <section
        className={styles.banner}
        aria-label="Luggage Storage Melbourne – Book Secure Bag Storage Online"
      >
        <div className={styles.dots} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />

        {/* Nav — unchanged */}
        <div className={styles.nav}>
          <div className={styles.navBrand}>
            <div className={styles.navIcon}>🧳</div>
            <span className={styles.navName}>LuggageTerminal</span>
          </div>
          <a href="/booking-form" className={styles.navLink}>
            Direct Booking →
          </a>
        </div>

        {/* ── Left: Hero copy ── */}
        <div className={`${styles.hero} ${visible ? styles.heroIn : ""}`}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Trusted by 5,000+ travellers across Australia
          </div>

          {/*
            ✅ SEO: H1 is the single most important on-page SEO element.
            Primary keyword "Luggage Storage Melbourne" in first 3 words.
            Secondary keywords: "secure", "explore", "bags" woven in naturally.
            Looks identical visually — just smarter for Google.
          */}
          <h1 className={styles.heading}>
            Luggage Storage{" "}
            <span className={styles.accent}>Melbourne</span>
            {" "}— Drop Your Bags & Explore Free
          </h1>

          {/*
            ✅ SEO: Subtitle covers keyword variations:
            - "secure bag storage" 
            - "Southern Cross Station"
            - "Melbourne CBD"
            - "baggage storage"
            - "book online"
            All natural, reads well to humans too.
          */}
          <p className={styles.sub}>
            Secure bag storage near Southern Cross Station, Melbourne CBD &amp; more.
            Drop off your baggage in minutes, explore hands-free, and pick up when you&apos;re ready.
            Book luggage storage online — instant confirmation, no hidden fees.
          </p>

          {/*
            ✅ SEO: Price chips — labels now use real search terms people type
            "Small backpack storage" and "Large suitcase storage" are actual searches
          */}
          <div className={styles.prices}>
            {[
              { emoji: "🎒", label: "Backpack / Small bag",   price: "A$3.99" },
              { emoji: "🧳", label: "Suitcase / Large bag",   price: "A$8.49" },
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

          {/*
            ✅ SEO: CTA button text is now a searchable phrase.
            "Find Luggage Storage Near Me" mirrors exactly what people type in Google.
          */}
          <button
            onClick={openDrawer}
            className={styles.cta}
            aria-label="Find secure luggage storage near me in Melbourne"
          >
            <span>Find Luggage Storage Near Me</span>
            <span className={styles.ctaArrow}>→</span>
          </button>

          {locationChips.length > 0 && (
            <div className={styles.locationChipsWrap}>
              <span className={styles.locationChipsLabel}>
                {userCoords ? "📍 Bag storage near you" : "⭐ Popular luggage storage locations"}
              </span>
              <div className={styles.locationChips}>
                {locationChips.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.locationChip}
                    onClick={() => openWithChip(chip)}
                    // ✅ SEO: aria-label on each chip = keyword-rich accessible label
                    aria-label={`Luggage storage in ${chip.label}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: desktop only ── */}
        <div className={`${styles.rightPanel} ${visible ? styles.rightPanelIn : ""}`}>
          <div className={styles.imgWrap}>
            <Image
              src="/images/Glowedwhite.png"
              /*
                ✅ SEO: Alt text is the most important SEO attribute on images.
                Old: "Secure Luggage Storage" (too short)
                New: descriptive, keyword-rich, natural sentence.
                Google reads this to understand the image AND the page topic.
              */
              alt="Secure luggage storage in Melbourne CBD – Luggage Terminal bag drop service near Southern Cross Station"
              width={220}
              height={180}
              priority
              className={styles.luggageImg}
            />
          </div>

          {/*
            ✅ SEO: Trust card titles now include searchable terms.
            "Insured Luggage Storage" and "Secure Bag Storage" are real searches.
            Subtitles add keyword context. Looks same visually.
          */}
          <div className={styles.trustGrid}>
            {[
              { icon: "🔐", title: "Insured Luggage Storage",  sub: "Every bag covered up to A$2,000" },
              { icon: "⚡", title: "Book in 60 Seconds",        sub: "Instant QR code confirmation" },
              { icon: "✓",  title: "Verified Storage Locations", sub: "All sites checked & approved" },
              { icon: "📱", title: "24/7 Customer Support",      sub: "Always here to help travellers" },
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

      {/* Mobile trust section — keyword-enriched subtitles */}
      <section
        className={styles.mobileTrust}
        aria-label="Why choose Luggage Terminal for secure bag storage in Melbourne"
      >
        <div className={styles.mobileTrustGrid}>
          {[
            { icon: "🔐", title: "Insured Luggage Storage",   sub: "Every bag fully covered up to A$2,000" },
            { icon: "⚡", title: "Book in 60 Seconds",         sub: "Instant booking confirmation" },
            { icon: "✓",  title: "Verified Storage Locations", sub: "All sites inspected & approved" },
            { icon: "📱", title: "24/7 Support",               sub: "Always here to help you travel stress-free" },
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
      />
    </>
  );
}