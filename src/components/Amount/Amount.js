"use client";

import React from "react";
import styles from "./Amount.module.css";

const Amount = () => {
  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <h2>Simple Pricing</h2>
        <p>No hidden fees · Pay per day</p>
      </header>

      {/* LUGGAGE */}
      <div className={styles.card}>
        <h3>🧳 Luggage Storage</h3>

        <div className={styles.priceRow}>
          <div className={styles.priceBox}>
            <span className={styles.title}>Small Bags 🎒</span>
            <span className={styles.amount}>3.99 AUD</span>
            <span className={styles.sub}>per bag / day</span>
          </div>

          <div className={styles.priceBox}>
            <span className={styles.title}>Medium/Large 🧳</span>
            <span className={styles.amount}>8.49 AUD</span>
            <span className={styles.sub}>per bag / day</span>
          </div>
        </div>

        <div className={styles.note}>
          🔒 Secure · 🕒 Flexible · 💳 Flat pricing
        </div>
      </div>

      {/* KEYS */}
      <div className={`${styles.card} ${styles.keyCard}`}>
        <h3>🔑 Key Storage</h3>

        <div className={styles.keyPrice}>
          <span className={styles.amount}>9.99 AUD</span>
          <span className={styles.sub}>per day</span>
        </div>

        <div className={styles.note}>
          Perfect for Airbnb & short-term rentals
        </div>
      </div>
    </section>
  );
};

export default Amount;
