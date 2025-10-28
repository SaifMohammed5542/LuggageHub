"use client";

import { useEffect } from "react";
import styles from "./Trustpilot.module.css";

export default function Trustpilot() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <section className={styles.trustSection}>
      <div className={styles.wrapper}>
        <h3 className={styles.heading}>What Our Customers Say</h3>

        <div
          className={`trustpilot-widget ${styles.widget}`}
          data-locale="en-US"
          data-template-id="56278e9abfbbba0bdcd568bc"
          data-businessunit-id="686d4c7a04686208777bb6f2"
          data-style-height="52px"
          data-style-width="100%"
        >
          <a
            href="https://www.trustpilot.com/review/luggageterminal.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.trustBtn}
          >
            ⭐ Review us on Truustpilot
          </a>
        </div>
      </div>
    </section>
  );
}
