// app/locations/city/[city]/page.js
import { notFound } from 'next/navigation';
import CityLocationClient from './CityLocationClient';

async function getStationsByCity(city) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.luggageterminal.com'}/api/station/list`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const all = data.stations || [];
    return all.filter(s =>
      s.city?.toLowerCase() === city.toLowerCase()
    );
  } catch { return []; }
}

function titleCase(str) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params }) {
  const cityName = titleCase(params.city);
  return {
    title: `Luggage Storage ${cityName} | From A$3.99/Day – Luggage Terminal`,
    description: `Secure luggage storage in ${cityName} from A$3.99/day. Multiple locations across ${cityName} CBD. Human-managed, insured up to A$2,000. Book online in 60 seconds.`,
    alternates: {
      canonical: `https://www.luggageterminal.com/locations/city/${params.city}`,
    },
    openGraph: {
      title: `Luggage Storage ${cityName} | From A$3.99/Day – Luggage Terminal`,
      description: `Secure luggage storage in ${cityName} from A$3.99/day.`,
      url: `https://www.luggageterminal.com/locations/city/${params.city}`,
    },
  };
}

export default async function CityLocationPage({ params }) {
  const cityName = titleCase(params.city);
  const stations = await getStationsByCity(params.city);

  if (!stations.length) notFound();

  // Get unique suburbs
  const suburbs = [...new Set(stations.map(s => s.suburb).filter(Boolean))];

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Luggage Storage in ${cityName}`,
    "description": `All Luggage Terminal secure luggage storage locations in ${cityName}. From A$3.99/day.`,
    "numberOfItems": stations.length,
    "itemListElement": stations.map((s, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": s.name,
      "url": `https://www.luggageterminal.com/locations/${s.slug}`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.luggageterminal.com" },
      { "@type": "ListItem", "position": 2, "name": "Locations", "item": "https://www.luggageterminal.com/locations" },
      { "@type": "ListItem", "position": 3, "name": `Luggage Storage ${cityName}`, "item": `https://www.luggageterminal.com/locations/city/${params.city}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <CityLocationClient
        cityName={cityName}
        citySlug={params.city}
        stations={stations}
        suburbs={suburbs}
      />
    </>
  );
}