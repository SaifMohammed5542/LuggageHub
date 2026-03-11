// app/locations/[slug]/page.js
import { notFound } from 'next/navigation';
import StationLocationClient from './StationLocationClient';

async function getStation(slug) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.luggageterminal.com'}/api/station/by-slug/${slug}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.station : null;
  } catch { return null; }
}

async function getAllStations() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.luggageterminal.com'}/api/station/list`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    return data.stations || [];
  } catch { return []; }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatHoursForSchema(timings) {
  if (!timings) return [];
  if (timings.is24Hours) return [{ "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], "opens": "00:00", "closes": "23:59" }];
  const dayMap = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
  };
  return Object.entries(dayMap)
    .filter(([key]) => timings[key] && !timings[key].closed)
    .map(([key, dayName]) => ({
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [dayName],
      "opens": timings[key].open,
      "closes": timings[key].close,
    }));
}

function getTodayHours(timings) {
  if (!timings) return null;
  if (timings.is24Hours) return 'Open 24 hours';
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const todayKey = days[new Date().getDay()];
  const t = timings[todayKey];
  if (!t || t.closed) return 'Closed today';
  return `Open today: ${t.open} – ${t.close}`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const station = await getStation(slug);
  if (!station) return { title: 'Location Not Found' };

  const title = `Luggage Storage at ${station.name} | From A$3.99/Day – Luggage Terminal`;
  const description = `Secure luggage storage at ${station.name}, ${station.location}, Melbourne. From A$3.99/day. ${getTodayHours(station.timings) || 'Open daily'}. Human-managed, insured up to A$2,000. Book online instantly.`;

  return {
    title,
    description,
    alternates: { canonical: `https://www.luggageterminal.com/locations/${slug}` },
    openGraph: { title, description, url: `https://www.luggageterminal.com/locations/${slug}` },
  };
}

export default async function StationLocationPage({ params }) {
  const { slug } = await params;
  const [station, allStations] = await Promise.all([getStation(slug), getAllStations()]);
  if (!station) notFound();

  const coords = station.coordinates?.coordinates;
  const suburbSlug = station.suburb?.toLowerCase().replace(/\s+/g, '-');
  const citySlug = station.city?.toLowerCase().replace(/\s+/g, '-') || 'melbourne';

  // ── 3 nearest stations (excluding current) ────────────────────────────────
  const nearbyStations = coords
    ? allStations
        .filter(s => s.slug !== slug)
        .map(s => {
          const c = s.coordinates?.coordinates;
          if (!c) return null;
          const distanceKm = haversineKm(coords[1], coords[0], c[1], c[0]);
          return { ...s, _id: s._id.toString(), distanceKm };
        })
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3)
    : [];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://www.luggageterminal.com/locations/${slug}`,
    "name": `Luggage Terminal – ${station.name}`,
    "description": `Secure luggage storage at ${station.location}, Melbourne. From A$3.99/day for small bags, A$8.49/day for large suitcases. Human-managed, insured up to A$2,000.`,
    "url": `https://www.luggageterminal.com/locations/${slug}`,
    "telephone": "+61-0406-177320",
    "email": "support@luggageterminal.com",
    "priceRange": "A$",
    "image": "https://www.luggageterminal.com/og-image.jpg",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": station.location,
      "addressLocality": station.suburb || "Melbourne CBD",
      "addressRegion": "VIC",
      "postalCode": "3000",
      "addressCountry": "AU",
    },
    ...(coords ? {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": coords[1],
        "longitude": coords[0],
      }
    } : {}),
    "openingHoursSpecification": formatHoursForSchema(station.timings),
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Luggage Storage",
      "itemListElement": [
        { "@type": "Offer", "name": "Small Bag Storage", "price": "3.99", "priceCurrency": "AUD", "availability": "https://schema.org/InStock" },
        { "@type": "Offer", "name": "Large Bag / Suitcase Storage", "price": "8.49", "priceCurrency": "AUD", "availability": "https://schema.org/InStock" },
      ],
    },
    ...(station.rating ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": station.rating,
        "reviewCount": station.reviewCount || 50,
        "bestRating": "5",
        "worstRating": "1",
      }
    } : {}),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `How do I store my luggage at ${station.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Book online at luggageterminal.com in 60 seconds. Select ${station.name}, choose your drop-off and pick-up times, pay securely, and receive an instant QR code. Show it at the counter on arrival — no printing needed.`,
        },
      },
      {
        "@type": "Question",
        "name": `How much does luggage storage cost at ${station.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Luggage storage at ${station.name} costs A$3.99/day for small bags and backpacks, and A$8.49/day for large suitcases. Flat daily rate — no hourly fees, no hidden charges.`,
        },
      },
      {
        "@type": "Question",
        "name": `What are the opening hours at ${station.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": station.timings?.is24Hours
            ? `${station.name} is open 24 hours a day, 7 days a week.`
            : `Please check the hours listed on this page. Hours vary by day — ${getTodayHours(station.timings) || "contact us for today's hours"}.`,
        },
      },
      {
        "@type": "Question",
        "name": `Is my luggage insured at ${station.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Yes. Every booking at ${station.name} includes insurance up to A$2,000 per booking at no extra cost. All locations are human-managed — not coin lockers.`,
        },
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.luggageterminal.com" },
      { "@type": "ListItem", "position": 2, "name": "Locations", "item": "https://www.luggageterminal.com/locations" },
      { "@type": "ListItem", "position": 3, "name": `${station.city || 'Melbourne'}`, "item": `https://www.luggageterminal.com/locations/city/${citySlug}` },
      ...(station.suburb ? [{ "@type": "ListItem", "position": 4, "name": station.suburb, "item": `https://www.luggageterminal.com/locations/suburb/${suburbSlug}` }] : []),
      { "@type": "ListItem", "position": station.suburb ? 5 : 4, "name": station.name, "item": `https://www.luggageterminal.com/locations/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <StationLocationClient
        station={{ ...station, _id: station._id.toString() }}
        citySlug={citySlug}
        suburbSlug={suburbSlug}
        todayHours={getTodayHours(station.timings)}
        nearbyStations={nearbyStations}
      />
    </>
  );
}