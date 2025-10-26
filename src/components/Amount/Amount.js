"use client";

import React from "react";
import styles from "./Amount.module.css";

const Amount = () => {
  return (
    <div className={styles["pricing-component"]}>
      <div className={styles["pricing-header"]}>
        <h3>Pricing</h3>
        <p>Affordable and Transparent</p>
      </div>

      <div className={styles["pricing-details"]}>
        <h3>For Luggage 🧳</h3>
        <div className={styles["price-item"]}>
          <span className={styles["price"]}>7.99 AUD</span>
          <span className={styles["per"]}>per bag / per day</span>
        </div>
        <p className={styles["note"]}>No hidden fees. Secure and hassle-free!</p>
      </div>

      <div className={styles["pricing-details"]}>
        <h3>For Key-handovers 🔑</h3>
        <div className={styles["price-item"]}>
          <span className={styles["price"]}>9.99 AUD</span>
          <span className={styles["per"]}>per day</span>
        </div>
        <p className={styles["note"]}>No hidden fees. Secure and hassle-free!</p>
      </div>
    </div>
  );
};

export default Amount;
