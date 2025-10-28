"use client";

import { useState } from "react";
import styles from "./Queries.module.css";

const Queries = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleSection = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const sections = [
    { title: "Guaranteed Security", content: "Your luggage is securely stored with round-the-clock surveillance." },
    { title: "One Rate for All Sizes", content: "Fixed Rate for All Bag Sizes – No Additional Fees." },
    { title: "No Hourly Charges", content: "One-Time Payment for All-Day Storage." },
    { title: "24/7 Support", content: "We are available 24/7 to assist you." },
  ];

  return (
    <div className={styles["banner-container"]}>
      <h2 className={styles["banner-title"]}>Effortless Luggage Storage – Book Instantly</h2>

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
