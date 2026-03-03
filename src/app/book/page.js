"use client";
import { useEffect, useState } from "react";
import BookingDrawer from "@/components/BookingDrawer/BookingDrawer";
import styles from "./page.module.css";

export default function BookPage() {
  const [open, setOpen] = useState(false);

  // Open drawer immediately when page loads
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className={styles.page}>
      {/* Ambient background while drawer is loading */}
      <div className={styles.bg}>
        <div className={styles.bgBlob1} />
        <div className={styles.bgBlob2} />
        <div className={styles.bgDots} />

        <div className={styles.center}>
          <div className={styles.logo}>🧳</div>
          <div className={styles.brand}>LuggageTerminal</div>
          <div className={styles.tagline}>Secure luggage storage near you</div>
        </div>
      </div>

      <BookingDrawer isOpen={open} onClose={() => (window.location.href = "/")} />
    </main>
  );
}