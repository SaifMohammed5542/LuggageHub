// app/locations/page.js
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Luggage Storage Locations Melbourne | Luggage Terminal',
  description: 'Find secure luggage storage locations across Melbourne CBD. Southern Cross Station, Bourke Street, Queen Street & more. From A$3.99/day. Book online instantly.',
  alternates: { canonical: 'https://www.luggageterminal.com/locations' },
  openGraph: {
    title: 'Luggage Storage Locations Melbourne | Luggage Terminal',
    description: 'Secure luggage storage across Melbourne CBD from A$3.99/day.',
    url: 'https://www.luggageterminal.com/locations',
  },
};

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

export default async function LocationsPage() {
  const stations = await getAllStations();

  // Group by city
  const byCity = {};
  stations.forEach(s => {
    const city = s.city || 'Melbourne';
    if (!byCity[city]) byCity[city] = [];
    byCity[city].push(s);
  });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.luggageterminal.com" },
      { "@type": "ListItem", "position": 2, "name": "Locations", "item": "https://www.luggageterminal.com/locations" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 32 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          {' › '}
          <span>Locations</span>
        </nav>

        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, marginBottom: 12 }}>
          Luggage Storage Locations in Melbourne
        </h1>
        <p style={{ opacity: 0.75, fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 40, maxWidth: 600 }}>
          {stations.length} secure luggage storage location{stations.length !== 1 ? 's' : ''} across
          Melbourne CBD. Drop your bags from <strong>A$3.99/day</strong> — human-managed,
          insured up to A$2,000, instant online booking.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
          {['🎒 Small bag — A$3.99/day', '🧳 Large/Suitcase — A$8.49/day'].map(t => (
            <span key={t} style={{
              fontSize: '0.85rem', padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'
            }}>{t}</span>
          ))}
        </div>

        {Object.entries(byCity).map(([city, cityStations]) => {
          const citySlug = city.toLowerCase().replace(/\s+/g, '-');
          const suburbs = [...new Set(cityStations.map(s => s.suburb).filter(Boolean))];

          return (
            <section key={city} style={{ marginBottom: 56 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 700, margin: 0 }}>
                  📍 {city}
                </h2>
                <Link href={`/locations/city/${citySlug}`} style={{
                  fontSize: '0.82rem', color: '#0284c7', textDecoration: 'none', fontWeight: 600,
                  padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(2,132,199,0.3)',
                }}>
                  View all {city} locations →
                </Link>
              </div>

              {suburbs.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: '0.8rem', opacity: 0.55, marginBottom: 12 }}>Browse by suburb:</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {suburbs.map(suburb => {
                      const suburbSlug = suburb.toLowerCase().replace(/\s+/g, '-');
                      const count = cityStations.filter(s => s.suburb === suburb).length;
                      return (
                        <Link key={suburb} href={`/locations/suburb/${suburbSlug}`} style={{
                          padding: '8px 16px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                          background: 'rgba(2,132,199,0.1)', border: '1px solid rgba(2,132,199,0.2)',
                          color: '#0284c7', textDecoration: 'none',
                        }}>
                          {suburb} · {count} location{count !== 1 ? 's' : ''}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {cityStations.map(s => (
                  <Link key={s._id} href={`/locations/${s.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      padding: '16px 18px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                      cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: '1.4rem' }}>🏪</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 3 }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.55, marginBottom: 4 }}>📍 {s.location}</div>
                          {s.suburb && <div style={{ fontSize: '0.72rem', opacity: 0.45 }}>{s.suburb}, {s.city}</div>}
                        </div>
                      </div>
                      <div style={{ marginTop: 12, fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                        View details & book →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 40, marginTop: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 14 }}>
            Secure Luggage Storage Across Melbourne CBD
          </h2>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.75, opacity: 0.75, maxWidth: 680, marginBottom: 12 }}>
            Luggage Terminal offers secure bag storage at {stations.length} verified locations across
            Melbourne CBD. Whether you need luggage storage near Southern Cross Station, Bourke Street,
            or Queen Street — we have a location within walking distance.
          </p>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.75, opacity: 0.75, maxWidth: 680 }}>
            All locations are human-managed (not coin lockers), monitored, and every booking includes
            insurance up to A$2,000. Small bags from A$3.99/day, large suitcases A$8.49/day.
            Book online in 60 seconds — instant QR code confirmation.
          </p>
        </section>

      </main>
      <Footer />
    </>
  );
}