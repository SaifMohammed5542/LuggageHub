"use client";

import React from "react";
import Image from "next/image";
import styles from "./HowItWorks.module.css";

function HowItWorks({ howItWorksRef }) {
  return (
    <section
      ref={howItWorksRef}
      id="list-topics"
      className={styles["how-it-works-section"]}
    >
      <div className={styles["container"]}>
        <div className={styles["section-header"]}>
          <span className={styles["badge"]}>Simple Process</span>
          <h2 className={styles["title"]}>How it Works</h2>
          <p className={styles["subtitle"]}>
            Store your bags in three easy steps and explore freely
          </p>
        </div>

        <div className={styles["steps-grid"]}>
          <div className={styles["step-card"]}>
            <div className={styles["step-number"]}>01</div>
            <div className={styles["icon-wrapper"]}>
              <div className={styles["icon-bg"]}></div>
              <Image
                src="/images/smartphone.png"
                alt="Book online"
                width={80}
                height={80}
                className={styles["step-icon"]}
              />
            </div>
            <h3 className={styles["step-title"]}>Book Online or on the App</h3>
            <p className={styles["step-description"]}>
              Get the app and choose a convenient location. Your bag protection
              is activated upon booking online.
            </p>
            <div className={styles["step-arrow"]}>→</div>
          </div>

          <div className={styles["step-card"]}>
            <div className={styles["step-number"]}>02</div>
            <div className={styles["icon-wrapper"]}>
              <div className={styles["icon-bg"]}></div>
              <Image
                src="/images/luggage (2).png"
                alt="Drop off bags"
                width={80}
                height={80}
                className={styles["step-icon"]}
              />
            </div>
            <h3 className={styles["step-title"]}>Head to the Store</h3>
            <p className={styles["step-description"]}>
              Drop off your bags by showing your confirmation to a store
              employee. Quick and secure process.
            </p>
            <div className={styles["step-arrow"]}>→</div>
          </div>

          <div className={styles["step-card"]}>
            <div className={styles["step-number"]}>03</div>
            <div className={styles["icon-wrapper"]}>
              <div className={styles["icon-bg"]}></div>
              <Image
                src="/images/enjoy.png"
                alt="Enjoy the day"
                width={80}
                height={80}
                className={styles["step-icon"]}
              />
            </div>
            <h3 className={styles["step-title"]}>Enjoy the Day!</h3>
            <p className={styles["step-description"]}>
              Make the most out of your day, then show your confirmation to pick
              up your stuff whenever you're ready.
            </p>
          </div>
        </div>

        <div className={styles["cta-section"]}>
          <p className={styles["cta-text"]}>Ready to explore hands-free?</p>
          <button className={styles["cta-button"]}>Get Started Now</button>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;