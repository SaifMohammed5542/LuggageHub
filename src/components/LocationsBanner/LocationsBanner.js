"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./LocationsBanner.module.css";

function getOpenStatus(timings) {
  if (!timings) return "unknown";
  if (timings.is24Hours) return "open";
  const now = new Date();
  const day = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][now.getDay()];
  const t = timings[day];
  if (!t || t.closed) return "closed";
  if (!t.open || !t.close) return "unknown";
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const openMins  = Number(t.open.split(":")[0])  * 60 + Number(t.open.split(":")[1]);
  const closeMins = Number(t.close.split(":")[0]) * 60 + Number(t.close.split(":")[1]);
  if (closeMins < openMins) return (nowMins >= openMins || nowMins <= closeMins) ? "open" : "closed";
  return (nowMins >= openMins && nowMins < closeMins) ? "open" : "closed";
}

function getTodayHours(timings) {
  if (!timings) return null;
  if (timings.is24Hours) return "Open 24 hrs";
  const day = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const t = timings[day];
  if (!t || t.closed) return "Closed today";
  if (!t.open || !t.close) return null;
  return `${t.open} – ${t.close}`;
}

export default function LocationsBanner() {
  const [stations, setStations] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/station/list")
      .then(r => r.json())
      .then(d => setStations(d.stations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build unique suburb chips from station data
  const suburbChips = [...new Map(
    stations
      .filter(s => s.suburb && s.slug)
      .map(s => [s.suburb, {
        label: s.suburb,
        slug: s.suburb.toLowerCase().replace(/\s+/g, "-"),
      }])
  ).values()].slice(0, 6);

  const citySlug = "melbourne";

  return (
    <section className={styles.section}>
      {/* Background decoration */}
      <div className={styles.bgDot} aria-hidden="true" />
      <div className={styles.bgDotRight} aria-hidden="true" />

      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.pill}>📍 Melbourne CBD &amp; surrounds</div>
          <h2 className={styles.heading}>
            Store your bags at a<br />
            <span className={styles.headingAccent}>location near you</span>
          </h2>
          <p className={styles.sub}>
            Human-managed storage at convenience stores across Melbourne.
            Book online, drop off in minutes.
          </p>
        </div>

        {/* Station cards */}
        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1,2,3,4].map(i => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            {stations.map(s => {
              const openStatus = getOpenStatus(s.timings);
              const hours      = getTodayHours(s.timings);
              const isFull     = s.capacity > 0 && s.currentCapacity >= s.capacity;

              return (
                <Link
                  key={s._id}
                  href={`/locations/${s.slug}`}
                  className={styles.card}
                >
                  {/* Status badge */}
                  <div className={styles.cardTop}>
                    {openStatus !== "unknown" && (
                      <span className={openStatus === "open" ? styles.badgeOpen : styles.badgeClosed}>
                        {openStatus === "open" ? "● Open now" : "● Closed"}
                      </span>
                    )}
                    {isFull && (
                      <span className={styles.badgeFull}>Full</span>
                    )}
                  </div>

                  {/* Icon + name */}
                  <div className={styles.cardIcon}>🏪</div>
                  <div className={styles.cardName}>{s.name}</div>
                  <div className={styles.cardAddress}>{s.location}</div>

                  {/* Meta row */}
                  <div className={styles.cardMeta}>
                    {hours && (
                      <span className={styles.cardHours}>⏰ {hours}</span>
                    )}
                    {s.suburb && (
                      <span className={styles.cardSuburb}>{s.suburb}</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className={styles.cardFooter}>
                    <span className={styles.cardRating}>⭐ {s.rating || "4.8"}</span>
                    <span className={styles.cardCta}>View details →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Suburb chips + CTA row */}
        <div className={styles.bottom}>
          {suburbChips.length > 0 && (
            <div className={styles.chipsRow}>
              <span className={styles.chipsLabel}>Browse by area:</span>
              {suburbChips.map(chip => (
                <Link
                  key={chip.slug}
                  href={`/locations/suburb/${chip.slug}`}
                  className={styles.chip}
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          )}
          <Link href={`/locations/city/${citySlug}`} className={styles.viewAll}>
            View all Melbourne locations →
          </Link>
        </div>
      </div>
    </section>
  );
}