// app/locations/suburb/[suburb]/page.js
// ─────────────────────────────────────────────────────────────────────────────
// SUBURB LOCATION PAGE — e.g. /locations/suburb/cbd
// Shows stations IN that suburb + nearby stations within 1.5km
// Fully dynamic — reads from your station database
// ─────────────────────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';
import SuburbLocationClient from './SuburbLocationClient';

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getCoords(station) {
  const c = station.coordinates?.coordinates;
  if (!c) return null;
  return { lat: c[1], lon: c[0] };
}

// Suburb display name map — add more as you expand
// Key = URL param (lowercase, hyphenated)
// Value = display name shown on page
const SUBURB_DISPLAY = {
  'cbd':           'Melbourne CBD',
  'melbourne-cbd': 'Melbourne CBD',
  'docklands':     'Docklands',
  'southbank':     'Southbank',
  'fitzroy':       'Fitzroy',
  'st-kilda':      'St Kilda',
  'richmond':      'Richmond',
  'north-melbourne': 'North Melbourne',
  'south-yarra':   'South Yarra',
  'collingwood':   'Collingwood',
};

// What suburb values in DB match this URL param
// e.g. /locations/suburb/cbd matches stations with suburb "CBD" or "Melbourne CBD"
const SUBURB_ALIASES = {
  'cbd':           ['CBD', 'Melbourne CBD', 'cbd', 'melbourne cbd'],
  'melbourne-cbd': ['CBD', 'Melbourne CBD', 'cbd', 'melbourne cbd'],
  'docklands':     ['Docklands', 'docklands'],
  'southbank':     ['Southbank', 'southbank'],
  'fitzroy':       ['Fitzroy', 'fitzroy'],
  'st-kilda':      ['St Kilda', 'st kilda', 'saint kilda'],
  'richmond':      ['Richmond', 'richmond'],
  'north-melbourne': ['North Melbourne', 'north melbourne'],
  'south-yarra':   ['South Yarra', 'south yarra'],
  'collingwood':   ['Collingwood', 'collingwood'],
};

// NEARBY_RADIUS_KM — stations within this distance show in "Also nearby" section
const NEARBY_RADIUS_KM = 1.5;

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

function titleCase(str) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// function getHoursDisplay(timings) {
//   if (!timings) return 'Contact us for hours';
//   if (timings.is24Hours) return 'Open 24 hours, 7 days';
//   const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
//   const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
//   return days.map((d, i) => {
//     const t = timings[d];
//     if (!t || t.closed) return `${labels[i]}: Closed`;
//     return `${labels[i]}: ${t.open}–${t.close}`;
//   }).join(', ');
// }

export async function generateMetadata({ params }) {
  const suburbName = SUBURB_DISPLAY[params.suburb] || titleCase(params.suburb);
  return {
    title: `Luggage Storage ${suburbName} | From A$3.99/Day – Luggage Terminal`,
    description: `Secure luggage storage in ${suburbName}, Melbourne. Drop your bags from A$3.99/day at verified locations. Human-managed, insured up to A$2,000. Book online instantly.`,
    alternates: {
      canonical: `https://www.luggageterminal.com/locations/suburb/${params.suburb}`,
    },
    openGraph: {
      title: `Luggage Storage ${suburbName} | From A$3.99/Day – Luggage Terminal`,
      description: `Secure luggage storage in ${suburbName}, Melbourne from A$3.99/day.`,
      url: `https://www.luggageterminal.com/locations/suburb/${params.suburb}`,
    },
  };
}

export default async function SuburbLocationPage({ params }) {
  const suburbName = SUBURB_DISPLAY[params.suburb] || titleCase(params.suburb);
  const aliases = SUBURB_ALIASES[params.suburb] || [titleCase(params.suburb)];

  const allStations = await getAllStations();

  // ── Split into: IN suburb vs NEARBY ──────────────────────────────────────

  // Stations exactly in this suburb
  const inSuburb = allStations.filter(s =>
    aliases.some(a => a.toLowerCase() === (s.suburb || '').toLowerCase())
  );

  // Calculate suburb center from average coords of inSuburb stations
  // If no stations in suburb, fall back to all stations center
  const pool = inSuburb.length > 0 ? inSuburb : allStations;
  const coordsPool = pool.map(getCoords).filter(Boolean);
  const suburbCenter = coordsPool.length > 0 ? {
    lat: coordsPool.reduce((s, c) => s + c.lat, 0) / coordsPool.length,
    lon: coordsPool.reduce((s, c) => s + c.lon, 0) / coordsPool.length,
  } : null;

  // Stations NOT in suburb but within NEARBY_RADIUS_KM of suburb center
  const nearby = suburbCenter ? allStations
    .filter(s => !aliases.some(a => a.toLowerCase() === (s.suburb || '').toLowerCase()))
    .map(s => {
      const c = getCoords(s);
      if (!c) return null;
      const dist = haversine(suburbCenter.lat, suburbCenter.lon, c.lat, c.lon);
      return dist <= NEARBY_RADIUS_KM ? { ...s, distanceKm: dist } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

  // If nothing at all — 404
  if (inSuburb.length === 0 && nearby.length === 0) notFound();

  // ── Schema ────────────────────────────────────────────────────────────────
  const allForSchema = [
    ...inSuburb.map(s => ({ ...s, _section: 'in' })),
    ...nearby.map(s => ({ ...s, _section: 'nearby' })),
  ];

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Luggage Storage in ${suburbName}, Melbourne`,
    "description": `Secure luggage storage locations in and near ${suburbName}, Melbourne. From A$3.99/day.`,
    "numberOfItems": allForSchema.length,
    "itemListElement": allForSchema.map((s, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": `Luggage Terminal – ${s.name}`,
      "url": `https://www.luggageterminal.com/locations/${s.slug}`,
      "description": `Secure luggage storage at ${s.location}. From A$3.99/day.`,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Where can I store my luggage in ${suburbName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Luggage Terminal has ${inSuburb.length} secure storage location${inSuburb.length !== 1 ? 's' : ''} in ${suburbName}${nearby.length > 0 ? ` plus ${nearby.length} more just steps away` : ''}. All locations are human-managed, insured up to A$2,000, and bookable online in 60 seconds.`,
        },
      },
      {
        "@type": "Question",
        "name": `How much does luggage storage cost in ${suburbName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Luggage storage in ${suburbName} starts from A$3.99/day for small bags and backpacks, and A$8.49/day for large suitcases. Flat daily rate — no hourly fees, no hidden charges.`,
        },
      },
      {
        "@type": "Question",
        "name": `Is luggage storage safe in ${suburbName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Yes. All Luggage Terminal locations in ${suburbName} are human-managed and monitored — not coin lockers. Every bag is insured up to A$2,000 per booking at no extra cost.`,
        },
      },
      {
        "@type": "Question",
        "name": "How do I book luggage storage?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Book online at luggageterminal.com in 60 seconds. Select your ${suburbName} location, choose drop-off and pick-up times, pay securely, and receive an instant QR code. Show it on arrival — no printing needed.`,
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
      { "@type": "ListItem", "position": 3, "name": `Luggage Storage ${suburbName}`, "item": `https://www.luggageterminal.com/locations/suburb/${params.suburb}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <SuburbLocationClient
        suburbName={suburbName}
        suburbSlug={params.suburb}
        inSuburb={inSuburb}
        nearby={nearby}
        suburbCenter={suburbCenter}
      />
    </>
  );
}