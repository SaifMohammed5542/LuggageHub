// app/blog/[slug]/page.js
import { notFound } from 'next/navigation';
import BlogPostClient from './BlogPostClient';

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

async function getBlog(slug) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.luggageterminal.com'}/api/blog/${slug}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.blog || null;
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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog) return { title: 'Post Not Found' };

  return {
    title: blog.metaTitle || `${blog.title} | Luggage Terminal`,
    description: blog.metaDescription || blog.excerpt,
    alternates: { canonical: `https://www.luggageterminal.com/blog/${slug}` },
    openGraph: {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt,
      url: `https://www.luggageterminal.com/blog/${slug}`,
      ...(blog.coverImage ? { images: [{ url: blog.coverImage }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const [blog, allStations] = await Promise.all([getBlog(slug), getAllStations()]);
  if (!blog || !blog.published) notFound();

  // ── Smart station CTA ─────────────────────────────────────────────────────
  let ctaStations = [];

  if (blog.targetSuburb) {
    // Find suburb center — use stored coords, or calculate from matching stations
    let centerLat = blog.suburbLat;
    let centerLon = blog.suburbLon;

    if (!centerLat || !centerLon) {
      // Calculate center from stations in that suburb
      const suburbStations = allStations.filter(s =>
        (s.suburb || '').toLowerCase() === blog.targetSuburb.toLowerCase()
      );
      const pool = suburbStations.length > 0 ? suburbStations : allStations;
      const coords = pool.map(s => s.coordinates?.coordinates).filter(Boolean);
      if (coords.length > 0) {
        centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        centerLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      }
    }

    if (centerLat && centerLon) {
      ctaStations = allStations
        .map(s => {
          const c = s.coordinates?.coordinates;
          if (!c) return null;
          const distanceKm = haversineKm(centerLat, centerLon, c[1], c[0]);
          return { ...s, _id: s._id.toString(), distanceKm };
        })
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3);
    }
  } else {
    // No target suburb — show all stations
    ctaStations = allStations.map(s => ({ ...s, _id: s._id.toString() }));
  }

  // ── Schema ────────────────────────────────────────────────────────────────
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blog.title,
    "description": blog.excerpt,
    "url": `https://www.luggageterminal.com/blog/${slug}`,
    "datePublished": blog.publishedAt || blog.createdAt,
    "dateModified": blog.updatedAt,
    "author": {
      "@type": "Organization",
      "name": "Luggage Terminal",
      "url": "https://www.luggageterminal.com",
    },
    "publisher": {
      "@type": "Organization",
      "name": "Luggage Terminal",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.luggageterminal.com/favicon.ico",
      },
    },
    ...(blog.coverImage ? { "image": blog.coverImage } : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.luggageterminal.com" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.luggageterminal.com/blog" },
      { "@type": "ListItem", "position": 3, "name": blog.title, "item": `https://www.luggageterminal.com/blog/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <BlogPostClient
        blog={{ ...blog, _id: blog._id?.toString() }}
        ctaStations={ctaStations}
        hasTargetSuburb={!!blog.targetSuburb}
      />
    </>
  );
}