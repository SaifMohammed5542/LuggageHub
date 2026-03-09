// app/sitemap.ts
import { MetadataRoute } from 'next'

const TODAY = new Date()
const BASE = 'https://www.luggageterminal.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [

    // ── Homepage ──────────────────────────────────────────────────────────────
    { url: `${BASE}`, lastModified: TODAY, changeFrequency: 'weekly', priority: 1.0 },

    // ── Core booking pages ────────────────────────────────────────────────────
    { url: `${BASE}/book`,          lastModified: TODAY, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/booking-form`,  lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/key-handover`,  lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/map-booking`,   lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },

    // ── Info pages ────────────────────────────────────────────────────────────
    { url: `${BASE}/faq`,                  lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/contact-us`,           lastModified: TODAY, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/become-a-partner`,     lastModified: TODAY, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/help`,                 lastModified: TODAY, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/cancellation-policy`,  lastModified: TODAY, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${BASE}/privacy-policy`,       lastModified: TODAY, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms-&amp;-conditions`,   lastModified: TODAY, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/shipping-policy`,      lastModified: TODAY, changeFrequency: 'yearly',  priority: 0.3 },

    // ── Locations index ───────────────────────────────────────────────────────
    { url: `${BASE}/locations`, lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },

    // ── City pages ────────────────────────────────────────────────────────────
    // "luggage storage Melbourne"
    { url: `${BASE}/locations/city/melbourne`, lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },

    // ── Suburb pages ──────────────────────────────────────────────────────────
    // "luggage storage Melbourne CBD"
    { url: `${BASE}/locations/suburb/cbd`,          lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/locations/suburb/melbourne-cbd`, lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },
    // Add more suburbs as you expand:
    // { url: `${BASE}/locations/suburb/docklands`,   lastModified: TODAY, changeFrequency: 'weekly', priority: 0.8 },
    // { url: `${BASE}/locations/suburb/southbank`,   lastModified: TODAY, changeFrequency: 'weekly', priority: 0.8 },

    // ── Individual station pages ──────────────────────────────────────────────
    // "luggage storage Bourke Street"
    {
      url: `${BASE}/locations/ezymart-660-bourke-st`,
      lastModified: TODAY,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // "luggage storage Southern Cross Station"
    {
      url: `${BASE}/locations/ezymart-southern-cross-station`,
      lastModified: TODAY,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // "luggage storage Queen Street Melbourne"
    {
      url: `${BASE}/locations/ezymart-queen-street`,
      lastModified: TODAY,
      changeFrequency: 'weekly',
      priority: 0.9,
    },

    // ── Blog index ────────────────────────────────────────────────────────────
    { url: `${BASE}/blog`, lastModified: TODAY, changeFrequency: 'weekly', priority: 0.8 },

    // ── Blog posts — existing ─────────────────────────────────────────────────
    { url: `${BASE}/blog/luggage-storage-southern-cross`,    lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog/melbourne-airport`,                  lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog/melbourne-events-luggage-storage`,   lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog/one-day-melbourne-itinerary`,        lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog/store-luggage-near-southern-cross`,  lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog/why-choose-luggage-terminal`,        lastModified: TODAY, changeFrequency: 'monthly', priority: 0.6 },

    // ── Blog posts — add as you publish ──────────────────────────────────────
    // { url: `${BASE}/blog/luggage-storage-melbourne-cbd`,          lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    // { url: `${BASE}/blog/luggage-storage-flinders-street`,        lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    // { url: `${BASE}/blog/cheap-luggage-storage-melbourne`,        lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    // { url: `${BASE}/blog/things-to-do-melbourne-without-luggage`, lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    // { url: `${BASE}/blog/luggage-storage-queen-victoria-market`,  lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    // { url: `${BASE}/blog/luggage-storage-docklands`,              lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    // { url: `${BASE}/blog/key-handover-melbourne`,                 lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    // { url: `${BASE}/blog/luggage-storage-mcg`,                   lastModified: TODAY, changeFrequency: 'monthly', priority: 0.6 },
  ]
}