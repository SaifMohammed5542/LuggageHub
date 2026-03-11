"use client";
// app/locations/[slug]/StationLocationClient.js

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingDrawer from '@/components/BookingDrawer/BookingDrawer';
import styles from './StationLocation.module.css';
import { useUserLocation, getWalkingTime } from '../../hooks/useWalkingTime';

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

function getTodayHours(timings) {
  if (!timings) return null;
  if (timings.is24Hours) return 'Open 24 hours';
  const todayKey = DAYS[new Date().getDay()];
  const t = timings[todayKey];
  if (!t || t.closed) return 'Closed today';
  return `Open today: ${t.open} – ${t.close}`;
}

function HoursTable({ timings }) {
  if (!timings) return null;
  if (timings.is24Hours) return <p className={styles.open24}>🟢 Open 24 hours, 7 days a week</p>;

  return (
    <table className={styles.hoursTable}>
      <tbody>
        {Object.entries(DAY_LABELS).map(([key, label]) => {
          const t = timings[key];
          const isToday = DAYS[new Date().getDay()] === key;
          return (
            <tr key={key} className={isToday ? styles.todayRow : ''}>
              <td className={styles.dayCell}>{label}{isToday ? ' (today)' : ''}</td>
              <td className={styles.timeCell}>
                {!t || t.closed ? <span className={styles.closed}>Closed</span> : `${t.open} – ${t.close}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function NearbyStationCard({ station, onBook, userLocation }) {
  const coords = station.coordinates?.coordinates;
  const walkingTime = getWalkingTime(userLocation, coords?.[1], coords?.[0]);
  const todayHours = getTodayHours(station.timings);
  const isFull = station.capacity > 0 && station.currentCapacity >= station.capacity;

  const distStr = station.distanceKm < 1
    ? `${Math.round(station.distanceKm * 1000)}m away`
    : `${station.distanceKm.toFixed(1)}km away`;

  return (
    <div className={styles.nearbyCard}>
      <div className={styles.nearbyCardTop}>
        <div className={styles.nearbyCardIcon}>🏪</div>
        <div className={styles.nearbyCardInfo}>
          <div className={styles.nearbyCardName}>{station.name}</div>
          <div className={styles.nearbyCardAddr}>📍 {station.location}</div>
          <div className={styles.nearbyCardDist}>📏 {distStr}</div>
          <div className={styles.nearbyCardWalk}>🚶 {walkingTime}</div>
          {todayHours && <div className={styles.nearbyCardHours}>⏰ {todayHours}</div>}
        </div>
      </div>
      <div className={styles.nearbyCardActions}>
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

export default function StationLocationClient({ station, citySlug, suburbSlug, todayHours, nearbyStations = [] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(station);
  const userLocation = useUserLocation();
  const coords = station.coordinates?.coordinates;

  const walkingTime = getWalkingTime(userLocation, coords?.[1], coords?.[0]);

  const handleBook = () => {
    setSelectedStation(station);
    setDrawerOpen(true);
  };

  const handleBookNearby = (s) => {
    setSelectedStation(s);
    setDrawerOpen(true);
  };

  const mapsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
    : `https://www.google.com/maps/search/${encodeURIComponent(station.location + ' Melbourne')}`;

  return (
    <>
      <Header />
      <main>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> ›{' '}
          <Link href="/locations">Locations</Link> ›{' '}
          {station.city && <><Link href={`/locations/city/${citySlug}`}>{station.city}</Link> › </>}
          {station.suburb && suburbSlug && <><Link href={`/locations/suburb/${suburbSlug}`}>{station.suburb}</Link> › </>}
          <span>{station.name}</span>
        </nav>

        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.badge}>📍 {station.suburb || 'Melbourne CBD'}, {station.city || 'Melbourne'}</div>
          <h1 className={styles.h1}>
            Luggage Storage at <span className={styles.accent}>{station.name}</span>
          </h1>
          <p className={styles.addr}>📍 {station.location}, Melbourne</p>
          <p className={styles.walkTime}>🚶 {walkingTime}</p>
          {todayHours && <p className={styles.hours}>⏰ {todayHours}</p>}
          <div className={styles.priceRow}>
            <span className={styles.priceChip}>🎒 Small bag — <strong>A$3.99/day</strong></span>
            <span className={styles.priceChip}>🧳 Large/Suitcase — <strong>A$8.49/day</strong></span>
          </div>
          <div className={styles.heroBtns}>
            <button onClick={handleBook} className={styles.bookBtn}>
              Book Now — From A$3.99/day →
            </button>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.directionsBtn}>
              Get Directions 🗺️
            </a>
          </div>
        </section>

        {/* Trust badges */}
        <section className={styles.trustSection}>
          <div className={styles.trustInner}>
            {[
              { icon: '🔒', title: 'Insured up to A$2,000', desc: 'Every booking covered' },
              { icon: '👤', title: 'Human-managed', desc: 'Not coin lockers' },
              { icon: '⚡', title: 'Instant confirmation', desc: 'QR code in seconds' },
              { icon: '💰', title: 'Flat daily rate', desc: 'No hourly tricks' },
            ].map(t => (
              <div key={t.title} className={styles.trustCard}>
                <span className={styles.trustIcon}>{t.icon}</span>
                <div>
                  <div className={styles.trustTitle}>{t.title}</div>
                  <div className={styles.trustDesc}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Details + Hours */}
        <section className={styles.detailsSection}>
          <div className={styles.detailsInner}>
            <div className={styles.detailsLeft}>
              <h2 className={styles.h2}>Location Details</h2>
              <div className={styles.detailRow}><span>📍</span><span>{station.location}, Melbourne VIC 3000</span></div>
              {station.suburb && <div className={styles.detailRow}><span>🏙️</span><span>{station.suburb}, {station.city || 'Melbourne'}</span></div>}
              <div className={styles.detailRow}><span>📞</span><span>+61 0406 177320</span></div>
              <div className={styles.detailRow}><span>✉️</span><span>support@luggageterminal.com</span></div>
              {station.capacity > 0 && (
                <div className={styles.detailRow}>
                  <span>🎒</span>
                  <span>Up to {station.capacity} bags at this location</span>
                </div>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsLink}>
                Open in Google Maps →
              </a>
            </div>

            <div className={styles.detailsRight}>
              <h2 className={styles.h2}>Opening Hours</h2>
              <HoursTable timings={station.timings} />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className={styles.howSection}>
          <div className={styles.howInner}>
            <h2 className={styles.h2}>How to Store Your Luggage at {station.name}</h2>
            <div className={styles.steps}>
              {[
                { n: '1', t: 'Book online', d: 'Choose this location, pick your dates, pay securely in 60 seconds.' },
                { n: '2', t: 'Get your QR code', d: 'Instant confirmation email with your unique QR code. No printing needed.' },
                { n: '3', t: 'Drop off your bags', d: `Show your QR code at ${station.name}. Staff will tag and store your bags safely.` },
                { n: '4', t: 'Explore Melbourne', d: 'Go hands-free. Your bags are safe, insured, and waiting for you.' },
                { n: '5', t: 'Pick up anytime', d: 'Return before closing time, show your QR code, collect your bags.' },
              ].map(s => (
                <div key={s.n} className={styles.step}>
                  <div className={styles.stepNum}>{s.n}</div>
                  <div>
                    <div className={styles.stepTitle}>{s.t}</div>
                    <div className={styles.stepDesc}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.faqSection}>
          <div className={styles.faqInner}>
            <h2 className={styles.h2}>FAQs — Luggage Storage at {station.name}</h2>
            <div className={styles.faqList}>
              {[
                {
                  q: `How much does luggage storage cost at ${station.name}?`,
                  a: `A$3.99/day for small bags and backpacks. A$8.49/day for large suitcases. Flat daily rate — no hourly fees, no hidden charges.`,
                },
                {
                  q: `How do I book luggage storage at ${station.name}?`,
                  a: `Book online at luggageterminal.com in 60 seconds. Select this location, choose your times, pay securely, and receive an instant QR code. Show it at the counter — no printing needed.`,
                },
                {
                  q: `Is my luggage insured at ${station.name}?`,
                  a: `Yes. Every booking includes insurance up to A$2,000 at no extra cost. All Luggage Terminal locations are human-managed — not coin lockers.`,
                },
                {
                  q: `Can I store luggage for just a few hours at ${station.name}?`,
                  a: `Yes. Our flat daily rate means you can store for a few hours or multiple days — same simple price per day.`,
                },
                {
                  q: `What size bags can I store at ${station.name}?`,
                  a: `We accept all bag sizes — small bags and backpacks (A$3.99/day) and large suitcases, duffel bags, and oversized luggage (A$8.49/day).`,
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

        {/* Other nearby stations */}
        {nearbyStations.length > 0 && (
          <section className={styles.nearbySection}>
            <div className={styles.nearbyInner}>
              <h2 className={styles.h2}>Other Luggage Storage Locations Nearby</h2>
              <p className={styles.nearbyNote}>
                Need an alternative? Here are the next closest Luggage Terminal locations.
              </p>
              <div className={styles.nearbyGrid}>
                {nearbyStations.map(s => (
                  <NearbyStationCard
                    key={s._id}
                    station={s}
                    onBook={handleBookNearby}
                    userLocation={userLocation}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className={styles.bottomCta}>
          <h2>Ready to drop your bags at {station.name}?</h2>
          <p>Book secure luggage storage in 60 seconds. Instant confirmation.</p>
          <button onClick={handleBook} className={styles.bookBtn}>
            Book Now — From A$3.99/day →
          </button>
        </section>
      </main>

      <Footer />
      <BookingDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        preselectedStation={selectedStation}
      />
    </>
  );
}