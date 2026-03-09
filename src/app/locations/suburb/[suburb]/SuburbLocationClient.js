"use client";
// app/locations/suburb/[suburb]/SuburbLocationClient.js

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingDrawer from '@/components/BookingDrawer/BookingDrawer';
import styles from './SuburbLocation.module.css';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
// const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function getTodayHours(timings) {
  if (!timings) return null;
  if (timings.is24Hours) return 'Open 24 hours';
  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const t = timings[todayKey];
  if (!t || t.closed) return 'Closed today';
  return `Open today: ${t.open} – ${t.close}`;
}

function DistanceBadge({ km }) {
  if (km == null) return null;
  const m = Math.round(km * 1000);
  const walkMins = Math.round((km / 5) * 60);
  const dist = km < 1 ? `${m}m` : `${km.toFixed(1)}km`;
  return (
    <span className={styles.distanceBadge}>
      🚶 {dist} · {walkMins} min walk
    </span>
  );
}

function StationCard({ station, onBook, isNearby }) {
  const todayHours = getTodayHours(station.timings);
  const isFull = station.capacity > 0 && station.currentCapacity >= station.capacity;
  // const coords = station.coordinates?.coordinates;

  return (
    <div className={`${styles.stationCard} ${isNearby ? styles.stationCardNearby : ''}`}>
      {isNearby && (
        <div className={styles.nearbyTag}>
          📍 Just outside — <DistanceBadge km={station.distanceKm} />
        </div>
      )}

      <div className={styles.cardTop}>
        <div className={styles.cardIcon}>🏪</div>
        <div className={styles.cardInfo}>
          <div className={styles.cardName}>{station.name}</div>
          <div className={styles.cardLocation}>📍 {station.location}</div>
          {todayHours && <div className={styles.cardHours}>⏰ {todayHours}</div>}
          {station.rating > 0 && (
            <div className={styles.cardRating}>
              ⭐ {station.rating}/5
              {station.reviewCount > 0 && ` (${station.reviewCount} reviews)`}
            </div>
          )}
        </div>
      </div>

      {/* Capacity indicator */}
      {station.capacity > 0 && (
        <div className={styles.capacityWrap}>
          <div className={styles.capacityBar}>
            <div
              className={styles.capacityFill}
              style={{
                width: `${Math.min(100, (station.currentCapacity / station.capacity) * 100)}%`,
                background: isFull ? '#ef4444' : (station.currentCapacity / station.capacity) > 0.8 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
          <span className={styles.capacityText}>
            {isFull ? '⛔ Full' : `${station.capacity - (station.currentCapacity || 0)} spots available`}
          </span>
        </div>
      )}

      <div className={styles.cardActions}>
        <Link href={`/locations/${station.slug}`} className={styles.detailsBtn}>
          View Details
        </Link>
        <button
          onClick={() => onBook(station)}
          className={styles.bookBtn}
          disabled={isFull}
        >
          {isFull ? 'Full' : 'Book Now →'}
        </button>
      </div>
    </div>
  );
}

export default function SuburbLocationClient({ suburbName, inSuburb, nearby }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialSearch, setInitialSearch] = useState(null);

  const handleBook = (station) => {
    const coords = station.coordinates?.coordinates;
    setInitialSearch(coords ? { label: station.name, lat: coords[1], lon: coords[0] } : null);
    setDrawerOpen(true);
  };

  const totalCount = inSuburb.length + nearby.length;

  return (
    <>
      <Header />
      <main>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link> ›{' '}
          <Link href="/locations">Locations</Link> ›{' '}
          <Link href="/locations/city/melbourne">Melbourne</Link> ›{' '}
          <span>Luggage Storage {suburbName}</span>
        </nav>

        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.badge}>📍 {suburbName}, Melbourne</div>
          <h1 className={styles.h1}>
            Luggage Storage in{' '}
            <span className={styles.accent}>{suburbName}</span>
          </h1>
          <p className={styles.subtitle}>
            {totalCount} secure bag storage location{totalCount !== 1 ? 's' : ''} in and around{' '}
            {suburbName}. Drop your luggage from <strong>A$3.99/day</strong> — human-managed,
            insured up to A$2,000, instant online booking.
          </p>
          <div className={styles.priceRow}>
            <span className={styles.priceChip}>🎒 Small bag — <strong>A$3.99/day</strong></span>
            <span className={styles.priceChip}>🧳 Large/Suitcase — <strong>A$8.49/day</strong></span>
          </div>
          <button onClick={() => { setInitialSearch(null); setDrawerOpen(true); }} className={styles.ctaBtn}>
            Find Storage Near Me →
          </button>
        </section>

        {/* In suburb stations */}
        {inSuburb.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionInner}>
              <h2 className={styles.h2}>
                Luggage Storage Locations in {suburbName} ({inSuburb.length})
              </h2>
              <div className={styles.stationsGrid}>
                {inSuburb.map(s => (
                  <StationCard key={s._id} station={s} onBook={handleBook} isNearby={false} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Nearby stations (just outside suburb) */}
        {nearby.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionInner}>
              <h2 className={styles.h2}>
                Also Nearby — Just Outside {suburbName}
              </h2>
              <p className={styles.nearbyNote}>
                These locations are a short walk from {suburbName} and may be more convenient
                depending on where you are.
              </p>
              <div className={styles.stationsGrid}>
                {nearby.map(s => (
                  <StationCard key={s._id} station={s} onBook={handleBook} isNearby={true} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SEO content section */}
        <section className={styles.seoSection}>
          <div className={styles.seoInner}>
            <h2 className={styles.h2}>
              Secure & Affordable Luggage Storage in {suburbName}, Melbourne
            </h2>
            <p className={styles.body}>
              Luggage Terminal offers secure, affordable bag storage across {suburbName} and
              the surrounding Melbourne CBD area. Whether you&apos;ve just arrived, checked out of
              your hotel, or have a few hours before your next move — drop your bags and
              explore {suburbName} completely hands-free.
            </p>
            <p className={styles.body}>
              All {suburbName} storage locations are <strong>human-managed</strong> — not coin
              lockers. Your bags are monitored at verified locations, and every booking includes{' '}
              <strong>insurance up to A$2,000</strong> at no extra cost.
            </p>
            <p className={styles.body}>
              Pricing is simple: <strong>A$3.99/day</strong> for small bags and backpacks,{' '}
              <strong>A$8.49/day</strong> for large suitcases. No hourly tricks, no hidden fees.
              Book online in 60 seconds and get an instant QR code for drop-off.
            </p>

            {/* FAQ */}
            <h2 className={styles.h2} style={{ marginTop: 40 }}>
              FAQs — Luggage Storage in {suburbName}
            </h2>
            <div className={styles.faqList}>
              {[
                {
                  q: `How much does luggage storage cost in ${suburbName}?`,
                  a: `From A$3.99/day for small bags, A$8.49/day for large suitcases. Flat daily rate — no hourly fees or hidden charges.`,
                },
                {
                  q: `How many luggage storage locations are in ${suburbName}?`,
                  a: `Luggage Terminal has ${inSuburb.length} location${inSuburb.length !== 1 ? 's' : ''} in ${suburbName}${nearby.length > 0 ? ` plus ${nearby.length} more within a short walk` : ''}. All are bookable online instantly.`,
                },
                {
                  q: `Is my luggage safe in ${suburbName}?`,
                  a: `Yes. All locations are human-managed and monitored — not coin lockers. Every bag is insured up to A$2,000 per booking.`,
                },
                {
                  q: `Can I store my luggage for just a few hours in ${suburbName}?`,
                  a: `Yes. Daily flat-rate pricing means you can store for a few hours or multiple days — same simple rate per day.`,
                },
              ].map((item, i) => (
                <details key={i} className={styles.faqItem}>
                  <summary className={styles.faqQ}>{item.q}</summary>
                  <p className={styles.faqA}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className={styles.bottomCta}>
          <h2>Ready to drop your bags in {suburbName}?</h2>
          <p>Book secure luggage storage in 60 seconds. Instant confirmation.</p>
          <button onClick={() => { setInitialSearch(null); setDrawerOpen(true); }} className={styles.ctaBtn}>
            Book Now — From A$3.99/day →
          </button>
        </section>
      </main>

      <Footer />

      <BookingDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        initialSearch={initialSearch}
      />
    </>
  );
}