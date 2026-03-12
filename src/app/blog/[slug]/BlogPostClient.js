"use client";
// app/blog/[slug]/BlogPostClient.js

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingDrawer from '@/components/BookingDrawer/BookingDrawer';
import styles from '../blog.module.css';
import { useUserLocation, getWalkingTime } from '../../hooks/useWalkingTime';

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function getTodayHours(timings) {
  if (!timings) return null;
  if (timings.is24Hours) return 'Open 24 hours';
  const todayKey = DAYS[new Date().getDay()];
  const t = timings[todayKey];
  if (!t || t.closed) return 'Closed today';
  return `${t.open} – ${t.close}`;
}

function StationCTACard({ station, onBook, userLocation }) {
  const coords = station.coordinates?.coordinates;
  const walkingTime = getWalkingTime(userLocation, coords?.[1], coords?.[0]);
  const todayHours = getTodayHours(station.timings);
  const isFull = station.capacity > 0 && station.currentCapacity >= station.capacity;

  const distStr = station.distanceKm != null
    ? station.distanceKm < 1
      ? `${Math.round(station.distanceKm * 1000)}m away`
      : `${station.distanceKm.toFixed(1)}km away`
    : null;

  return (
    <div className={styles.ctaCard}>
      <div className={styles.ctaCardInfo}>
        <div className={styles.ctaCardName}>{station.name}</div>
        <div className={styles.ctaCardAddr}>📍 {station.location}</div>
        {distStr && <div className={styles.ctaCardDist}>📏 {distStr}</div>}
        <div className={styles.ctaCardWalk}>🚶 {walkingTime}</div>
        {todayHours && <div className={styles.ctaCardHours}>⏰ {todayHours}</div>}
      </div>
      <div className={styles.ctaCardActions}>
        <Link href={`/locations/${station.slug}`} className={styles.ctaDetailsBtn}>
          View Details
        </Link>
        <button
          onClick={() => onBook(station)}
          className={styles.ctaBookBtn}
          disabled={isFull}
        >
          {isFull ? 'Full' : 'Book Now →'}
        </button>
      </div>
    </div>
  );
}

export default function BlogPostClient({ blog, ctaStations, hasTargetSuburb }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const userLocation = useUserLocation();

  const handleBookGeneric = () => {
    setSelectedStation(null);
    setDrawerOpen(true);
  };

  const handleBookStation = (station) => {
    setSelectedStation(station);
    setDrawerOpen(true);
  };

  return (
    <>
      <Header />
      <main className={styles.postMain}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> ›{' '}
          <Link href="/blog">Blog</Link> ›{' '}
          <span>{blog.title}</span>
        </nav>

        {/* Post container */}
        <article className={styles.postContainer}>
          {/* Cover image */}
          {blog.coverImage && (
            <div className={styles.coverImg}>
              <img src={blog.coverImage} alt={blog.title} />
            </div>
          )}

          {/* Meta */}
          <div className={styles.postMeta}>
            <span className={styles.postRead}>☕ {blog.readTime || 3} min read</span>
            {blog.publishedAt && (
              <span className={styles.postDate}>
                {new Date(blog.publishedAt).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className={styles.postTitle}>{blog.title}</h1>

          {/* Content — rendered as HTML */}
          <div
            className={styles.postContent}
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* ── Smart CTA Section ─────────────────────────────────── */}
          <div className={styles.ctaSection}>
            <div className={styles.ctaTop}>
              <h2 className={styles.ctaTitle}>
                {hasTargetSuburb
                  ? '🧳 Store your bags nearby'
                  : '🧳 Find luggage storage in Melbourne'}
              </h2>
              <p className={styles.ctaSubtitle}>
                Drop your bags and explore hands-free from A$3.99/day.
              </p>
              <button onClick={handleBookGeneric} className={styles.ctaMainBtn}>
                Book Now — From A$3.99/day →
              </button>
            </div>

            {ctaStations.length > 0 && (
              <div className={styles.ctaStations}>
                <p className={styles.ctaStationsLabel}>
                  {hasTargetSuburb ? 'Nearest locations:' : 'All locations:'}
                </p>
                <div className={styles.ctaGrid}>
                  {ctaStations.map(s => (
                    <StationCTACard
                      key={s._id}
                      station={s}
                      onBook={handleBookStation}
                      userLocation={userLocation}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Back to blog */}
        <div className={styles.backRow}>
          <Link href="/blog" className={styles.backLink}>← Back to all posts</Link>
        </div>
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