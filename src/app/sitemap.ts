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
    { url: `${BASE}/locations/city/melbourne`, lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },

    // ── Suburb pages ──────────────────────────────────────────────────────────
    { url: `${BASE}/locations/suburb/cbd`,           lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/locations/suburb/melbourne-cbd`, lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },

    // ── Individual station pages ──────────────────────────────────────────────
    { url: `${BASE}/locations/660-bourke-st`,          lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/locations/southern-cross-station`, lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/locations/341-queen-street`,       lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/locations/520-bourke-st`,          lastModified: TODAY, changeFrequency: 'weekly', priority: 0.9 },

    // ── Blog index ────────────────────────────────────────────────────────────
    { url: `${BASE}/blog`, lastModified: TODAY, changeFrequency: 'weekly', priority: 0.8 },

    // ── Blog posts — Batch 1 (Direct storage keywords) ───────────────────────
    { url: `${BASE}/blog/luggage-storage-melbourne-cbd`,          lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog/luggage-storage-southern-cross-station`, lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog/luggage-storage-flinders-street`,        lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog/cheap-luggage-storage-melbourne`,        lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog/luggage-storage-bourke-street`,          lastModified: TODAY, changeFrequency: 'monthly', priority: 0.8 },

    // ── Blog posts — Batch 2 (Activity + storage guides) ─────────────────────
    { url: `${BASE}/blog/things-to-do-melbourne-without-luggage`, lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog/luggage-storage-queen-victoria-market`,  lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog/luggage-storage-docklands`,              lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog/luggage-storage-mcg`,                    lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },

    // ── Blog posts — add as you publish ──────────────────────────────────────
    // Batch 3 — Suburb guides:
    // { url: `${BASE}/blog/luggage-storage-southbank`, lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    // { url: `${BASE}/blog/luggage-storage-fitzroy`,   lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    // { url: `${BASE}/blog/luggage-storage-st-kilda`,  lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    // Batch 4 — Awareness:
    // { url: `${BASE}/blog/key-handover-melbourne`,                   lastModified: TODAY, changeFrequency: 'monthly', priority: 0.7 },
    // { url: `${BASE}/blog/is-luggage-storage-safe-melbourne`,        lastModified: TODAY, changeFrequency: 'monthly', priority: 0.6 },
    // { url: `${BASE}/blog/hotel-checkout-luggage-storage-melbourne`, lastModified: TODAY, changeFrequency: 'monthly', priority: 0.6 },
  ]
}