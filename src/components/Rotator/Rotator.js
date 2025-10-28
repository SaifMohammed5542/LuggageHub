"use client";
import React from "react";
import styles from "./Rotator.module.css";

const RotatingText = () => {
  return (
    <div className={styles.marqueeContainer}>
      <div className={styles.marquee}>
        <p>
          🚀 Welcome to <strong>Luggage Terminal</strong> 🛄 &nbsp; 🚀 Unburden your journey —
          store your luggage hassle-free! &nbsp; ✨ More exploring, less carrying! 🧳
        </p>
      </div>
    </div>
  );
};

export default RotatingText;
