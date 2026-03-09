"use client";
// app/locations/city/[city]/CityLocationClient.js

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingDrawer from '@/components/BookingDrawer/BookingDrawer';
import styles from './CityLocation.module.css';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

function getTodayHours(timings) {
  if (!timings) return null;
  if (timings.is24Hours) return 'Open 24 hours';
  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const t = timings[todayKey];
  if (!t || t.closed) return 'Closed today';
  return `Open today: ${t.open} – ${t.close}`;
}

function StationCard({ station, onBook }) {
  const todayHours = getTodayHours(station.timings);
  const isFull = station.capacity > 0 && station.currentCapacity >= station.capacity;

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>🏪</span>
        <div className={styles.cardInfo}>
          <div className={styles.cardName}>{station.name}</div>
          <div className={styles.cardAddr}>📍 {station.location}</div>
          {station.suburb && <div className={styles.cardSuburb}>{station.suburb}</div>}
          {todayHours && <div className={styles.cardHours}>⏰ {todayHours}</div>}
        </div>
      </div>

      {station.capacity > 0 && (
        <div className={styles.capWrap}>
          <div className={styles.capBar}>
            <div className={styles.capFill} style={{
              width: `${Math.min(100, ((station.currentCapacity || 0) / station.capacity) * 100)}%`,
              background: isFull ? '#ef4444' : ((station.currentCapacity || 0) / station.capacity) > 0.8 ? '#f59e0b' : '#22c55e',
            }} />
          </div>
          <span className={styles.capText}>
            {isFull ? '⛔ Full' : `${station.capacity - (station.currentCapacity || 0)} spots available`}
          </span>
        </div>
      )}

      <div className={styles.cardActions}>
        <Link href={`/locations/${station.slug}`} className={styles.detailsBtn}>View Details</Link>
        <button onClick={() => onBook(station)} className={styles.bookBtn} disabled={isFull}>
          {isFull ? 'Full' : 'Book Now →'}
        </button>
      </div>
    </div>
  );
}

export default function CityLocationClient({ cityName, stations, suburbs }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialSearch, setInitialSearch] = useState(null);

  const handleBook = (station) => {
    const c = station.coordinates?.coordinates;
    setInitialSearch(c ? { label: station.name, lat: c[1], lon: c[0] } : null);
    setDrawerOpen(true);
  };

  return (
    <>
      <Header />
      <main>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> ›{' '}
          <Link href="/locations">Locations</Link> ›{' '}
          <span>Luggage Storage {cityName}</span>
        </nav>

        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.badge}>📍 {cityName}, Australia</div>
          <h1 className={styles.h1}>
            Luggage Storage in <span className={styles.accent}>{cityName}</span>
          </h1>
          <p className={styles.subtitle}>
            {stations.length} secure bag storage location{stations.length !== 1 ? 's' : ''} across{' '}
            {cityName}. Drop your luggage from <strong>A$3.99/day</strong> — human-managed,
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

        {/* Browse by suburb */}
        {suburbs.length > 0 && (
          <section className={styles.section}>
            <div className={styles.inner}>
              <h2 className={styles.h2}>Browse by Suburb</h2>
              <div className={styles.suburbRow}>
                {suburbs.map(suburb => {
                  const suburbSlug = suburb.toLowerCase().replace(/\s+/g, '-');
                  const count = stations.filter(s => s.suburb === suburb).length;
                  return (
                    <Link key={suburb} href={`/locations/suburb/${suburbSlug}`} className={styles.suburbChip}>
                      {suburb} · {count} location{count !== 1 ? 's' : ''}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* All stations */}
        <section className={styles.section}>
          <div className={styles.inner}>
            <h2 className={styles.h2}>
              All Luggage Storage Locations in {cityName} ({stations.length})
            </h2>
            <div className={styles.grid}>
              {stations.map(s => (
                <StationCard key={s._id} station={s} onBook={handleBook} />
              ))}
            </div>
          </div>
        </section>

        {/* SEO text */}
        <section className={styles.seoSection}>
          <div className={styles.inner}>
            <h2 className={styles.h2}>Secure & Affordable Luggage Storage in {cityName}</h2>
            <p className={styles.body}>
              Luggage Terminal operates {stations.length} secure, human-managed luggage storage
              locations across {cityName} CBD. Whether you&apos;re arriving at Southern Cross Station,
              exploring Bourke Street Mall, or heading to Queen Victoria Market — there&apos;s a
              Luggage Terminal location within walking distance.
            </p>
            <p className={styles.body}>
              Pricing is simple and transparent: <strong>A$3.99/day</strong> for small bags
              and backpacks, <strong>A$8.49/day</strong> for large suitcases. No hourly tricks,
              no hidden fees. Every booking includes insurance up to A$2,000 at no extra cost.
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className={styles.bottomCta}>
          <h2>Ready to drop your bags in {cityName}?</h2>
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