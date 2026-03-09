"use client"
// app/page.tsx
// NOTE: SEO metadata is now handled in layout.tsx via the metadata export.
// Per-page overrides (if needed) go in a separate server component wrapper.
// This page stays "use client" for scroll/ref/loading logic.

import React, { useRef, useEffect, useState } from 'react';
import "../../public/ALL CSS/Page.css"
import Header from '@/components/Header';
import Banner from '@/components/Banner';
import Amount from '@/components/Amount';
import HowItWorks from '@/components/HowItWorks';
import Testimonials from '@/components/Testimonials';
import OurTopServices from '@/components/OurTopServices';
import Queries from '@/components/Queries';
import Footer from '@/components/Footer';
import Rotatingtext from '@/components/Rotator';
import Loader from '../components/Loader';
import WhatsAppFloating from "../components/WhatsAppFloating";
import BecomePartnerButton from '@/components/BecomePartnerButton/become-partner';

// ============================================================
// FAQ Schema for homepage — injected client-side
// This powers expandable Q&As directly in Google search results!
// Update questions/answers to match your real Queries component content.
// ============================================================
// ============================================================
// UPDATED FAQ SCHEMA — paste this into page.tsx
// Replace the existing faqSchema object (the whole const faqSchema = {...})
// These questions EXACTLY match the new Queries.js accordion questions
// so Google's FAQ rich results match what users see on the page.
// ============================================================

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does luggage storage cost in Melbourne?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Luggage Terminal offers affordable luggage storage in Melbourne starting from A$3.99/day for small bags and backpacks, and A$8.49/day for large suitcases. Pricing is a flat daily rate — no hourly fees, no hidden charges. One straightforward price per item, per day.",
      },
    },
    {
      "@type": "Question",
      "name": "Where can I store my luggage near Southern Cross Station?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Luggage Terminal has secure bag storage locations conveniently close to Southern Cross Station in Melbourne CBD. Simply book online, get an instant QR code, and drop your bags off in minutes. Perfect for travellers arriving on the SkyBus from Melbourne Airport or interstate trains.",
      },
    },
    {
      "@type": "Question",
      "name": "Is my luggage safe at Luggage Terminal?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — your bags are fully secure. Unlike coin lockers that can be tampered with, Luggage Terminal uses human-managed storage locations with on-site monitoring. Every item is stored at a verified, inspected location. Plus, all luggage is insured up to A$2,000 per booking for total peace of mind.",
      },
    },
    {
      "@type": "Question",
      "name": "How do I book luggage storage online?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Booking is simple. Visit luggageterminal.com, select your nearest storage location, choose your drop-off and pick-up dates, and pay securely online. You'll receive an instant booking confirmation with a QR code — no printing needed, just show it on your phone at drop-off.",
      },
    },
    {
      "@type": "Question",
      "name": "Can I store luggage for just a few hours or part of a day?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! Luggage Terminal offers flexible bag storage for as short or as long as you need. Whether you want to drop your bags for a couple of hours while exploring Melbourne CBD, or store them for multiple days, our daily flat-rate pricing makes it easy and affordable.",
      },
    },
    {
      "@type": "Question",
      "name": "Do you offer luggage storage near Melbourne Airport?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Luggage Terminal has storage options conveniently accessible from Melbourne Airport (Tullamarine). Catch the SkyBus to Southern Cross Station and drop your bags at our nearby location before heading out to explore Melbourne, or store them after check-out before your flight.",
      },
    },
    {
      "@type": "Question",
      "name": "What sizes of bags can I store?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We accept all bag sizes — backpacks, carry-on bags, standard suitcases, large suitcases, duffel bags, shopping bags, and oversized luggage. Small bags start at A$3.99/day. Large bags and suitcases are A$8.49/day. One flat rate, no size surprises.",
      },
    },
    {
      "@type": "Question",
      "name": "Does Luggage Terminal offer key handover services in Melbourne?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! In addition to secure luggage storage, Luggage Terminal offers key handover services across Melbourne. Ideal for Airbnb hosts, short-term rental properties, and anyone who needs a reliable, secure way to hand off or receive keys without needing to be present in person.",
      },
    },
  ],
};

function App() {
  const [loading, setLoading] = useState(true);

  // Inject FAQ schema client-side (since this is a client component)
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-schema";
    script.text = JSON.stringify(faqSchema);
    if (!document.getElementById("faq-schema")) {
      document.head.appendChild(script);
    }
    return () => {
      const el = document.getElementById("faq-schema");
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overscrollBehavior = 'none';

    const handleLoad = () => setLoading(false);

    if (document.readyState === "complete") {
      setLoading(false);
    } else {
      window.addEventListener("load", handleLoad);
      return () => {
        window.removeEventListener("load", handleLoad);
        document.body.style.overscrollBehavior = '';
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    const t = setTimeout(() => {
      if (hash === "services") {
        scrollToSection("services");
      } else if (hash === "how-it-works" || hash === "howItWorks" || hash === "howitworks") {
        scrollToSection("howItWorks");
      } else {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);

    return () => clearTimeout(t);
  }, []);

  const servicesRef = useRef<HTMLDivElement | null>(null);
  const howItWorksRef = useRef<HTMLDivElement | null>(null);

  interface ScrollToSectionProps {
    section: "services" | "howItWorks";
  }

  const scrollToSection = (section: ScrollToSectionProps["section"]) => {
    const ref = section === "services" ? servicesRef : howItWorksRef;
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return <Loader visible={loading} />;
  }

  return (
    <>
      <div className='Holder'>
        <Header
          scrollToServices={() => scrollToSection("services")}
          scrollTohowItWorks={() => scrollToSection("howItWorks")}
        />
        <Banner />
      </div>

      <Rotatingtext />
      <Amount />
      <br />
      <HowItWorks howItWorksRef={howItWorksRef} />
      <br />
      <WhatsAppFloating />
      <Testimonials />
      <br />
      <OurTopServices servicesRef={servicesRef} />
      <br />
      <Queries />
      <br />
      <BecomePartnerButton />
      <br />
      <Footer />
    </>
  );
}

export default App;