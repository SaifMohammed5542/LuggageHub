"use client";
// components/Queries/Queries.js
// SEO CHANGES:
//   - H2 heading now targets a primary search phrase
//   - FAQ questions rewritten to match exactly what people Google
//   - FAQ answers are keyword-rich but natural-sounding
//   - Covers: price, location, safety, hours, booking, key handover, comparison
//   - These Q&As feed into the FAQPage schema in page.tsx
//   - ALL visual logic (accordion open/close) is 100% unchanged

import { useState } from "react";
import styles from "./Queries.module.css";

const Queries = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleSection = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  /*
    ✅ SEO STRATEGY for FAQs:
    - Question = exactly what someone types in Google
    - Answer = natural paragraph that contains keyword variations
    - Google pulls these into "People Also Ask" boxes in search results
    - They also power the FAQPage schema we inject in page.tsx
    
    Keywords woven through answers:
    luggage storage Melbourne / bag storage / secure storage /
    Southern Cross Station / Melbourne CBD / left luggage /
    baggage storage / per day / book online / key handover /
    affordable / cheap / safe / instant confirmation
  */
  const sections = [
    {
      title: "How much does luggage storage cost in Melbourne?",
      content:
        "Luggage Terminal offers affordable luggage storage in Melbourne starting from A$3.99/day for small bags and backpacks, and A$8.49/day for large suitcases. Pricing is a flat daily rate — no hourly fees, no hidden charges. One straightforward price per item, per day.",
    },
    {
      title: "Where can I store my luggage near Southern Cross Station?",
      content:
        "Luggage Terminal has secure bag storage locations conveniently close to Southern Cross Station in Melbourne CBD. Simply book online, get an instant QR code, and drop your bags off in minutes. Perfect for travellers arriving on the SkyBus from Melbourne Airport or interstate trains.",
    },
    {
      title: "Is my luggage safe at Luggage Terminal?",
      content:
        "Yes — your bags are fully secure. Unlike coin lockers that can be tampered with, Luggage Terminal uses human-managed storage locations with on-site monitoring. Every item is stored at a verified, inspected location. Plus, all luggage is insured up to A$2,000 per booking for total peace of mind.",
    },
    {
      title: "How do I book luggage storage online?",
      content:
        "Booking is simple. Visit luggageterminal.com, select your nearest storage location, choose your drop-off and pick-up dates, and pay securely online. You'll receive an instant booking confirmation with a QR code — no printing needed, just show it on your phone at drop-off.",
    },
    {
      title: "Can I store luggage for just a few hours or part of a day?",
      content:
        "Yes! Luggage Terminal offers flexible bag storage for as short or as long as you need. Whether you want to drop your bags for a couple of hours while exploring Melbourne CBD, or store them for multiple days, our daily flat-rate pricing makes it easy and affordable.",
    },
    {
      title: "Do you offer luggage storage near Melbourne Airport?",
      content:
        "Yes. Luggage Terminal has storage options conveniently accessible from Melbourne Airport (Tullamarine). Catch the SkyBus to Southern Cross Station and drop your bags at our nearby location before heading out to explore Melbourne, or store them after check-out before your flight.",
    },
    {
      title: "What sizes of bags can I store?",
      content:
        "We accept all bag sizes — backpacks, carry-on bags, standard suitcases, large suitcases, duffel bags, shopping bags, and oversized luggage. Small bags (backpacks, hand luggage) start at A$3.99/day. Large bags and suitcases are A$8.49/day. One flat rate, no size surprises.",
    },
    {
      title: "Does Luggage Terminal offer key handover services in Melbourne?",
      content:
        "Yes! In addition to secure luggage storage, Luggage Terminal offers key handover services across Melbourne. This is ideal for Airbnb hosts, short-term rental properties, and anyone who needs a reliable, secure way to hand off or receive keys without needing to be present in person.",
    },
  ];

  return (
    <div className={styles["banner-container"]}>
      {/*
        ✅ SEO: H2 targets "luggage storage Melbourne" + action phrase.
        H2s carry strong ranking signals — this one covers:
        - "luggage storage Melbourne" (primary keyword)
        - "secure" (trust signal)
        - "affordable" (price intent)
        - "book instantly" (action intent)
      */}
      <h2 className={styles["banner-title"]}>
        Secure &amp; Affordable Luggage Storage in Melbourne — Frequently Asked Questions
      </h2>

      <div className={styles.accordion} role="list">
        {sections.map((section, index) => (
          <div key={index} className={styles["accordion-item"]} role="listitem">
            <button
              type="button"
              aria-expanded={openIndex === index}
              className={styles["accordion-header"]}
              onClick={() => toggleSection(index)}
            >
              <strong>{section.title}</strong>
              <span className={styles.icon} aria-hidden>{openIndex === index ? "−" : "+"}</span>
            </button>

            <div
              className={`${styles["accordion-content"]} ${openIndex === index ? styles.open : ""}`}
              aria-hidden={openIndex !== index}
            >
              <p>{section.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Queries;