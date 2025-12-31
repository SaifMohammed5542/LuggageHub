"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";


  const phoneNumber = "918978881569"; // change to your full WhatsApp number
  const defaultMessage = "Hi Luggage Terminal! I need help with my booking.";
  const waUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

const Footer = () => {
  return (
    <footer
      className={styles.footer}
      role="contentinfo"
      aria-label="Luggage Terminal footer"
    >
      {/* Top: Logo + short tagline */}
      <div className={styles["footer-top"]}>
        <div className={styles["footer-logo"]} aria-hidden>
          <Image
            src="/images/GlowBag.png"
            alt="Luggage Terminal Logo"
            width={240}
            height={120}
            priority
          />
        </div>

        <div className={styles["footer-tagline"]}>
          <p className={styles["tagline-heading"]}>Luggage Terminal</p>
          <p className={styles["tagline-sub"]}>
            Secure, convenient luggage and key-handover at trusted partner
            stations.
          </p>
        </div>
      </div>

      {/* Main content: links, contact, socials */}
      <div className={styles["footer-container"]}>
        <div className={styles["footer-section"]}>
          <h3>Quick Links</h3>
          <ul className={styles["footer-links"]}>
                        <li>
              <Link href="/terms-of-service" className={styles.link}>
                Terms & Conditions
              </Link>
            </li>
                        <li>
              <Link href="/privacy-policy" className={styles.link}>
                Privacy Policy
              </Link>
            </li>
                        <li>
              <Link href="/cancellation-policy" className={styles.link}>
                Cancellation Policy
              </Link>
            </li>
            <li>
              <Link href="/contact-us" className={styles.link}>
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/shipping-policy" className={styles.link}>
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link href="/faq" className={styles.link}>
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/help" className={styles.link}>
                Help
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles["footer-section"]}>
          <h3>Contact Us</h3>
          <ul className={styles["footer-contact"]}>
            <li>
              Email:{" "}
              <a
                href="mailto:support@luggageterminal.com"
                className={styles["mailto"]}
              >
                support@luggageterminal.com
              </a>
            </li>
            <li>
              WhatsApp:{" "}
              <a
                href={waUrl}
                className={styles["mailto"]}
              >
                +91 897888 1569
              </a>
            </li>
          </ul>
        </div>

        <div className={styles["footer-section"]}>
          <h3>Follow Us</h3>

          <div className={styles["social-row"]}>
           
            <a
              className={styles["social-btn"]}
              href="https://instagram.com/LuggageTerminal"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Luggage Terminal on Instagram"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zM18.4 6.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z"
                  fill="currentColor"
                />
              </svg>
              <span className={styles["social-text"]}>Instagram</span>
            </a>

             <a
  className={styles["social-btn"]}
  href="https://www.linkedin.com/company/luggage-terminal"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Luggage Terminal on LinkedIn"
>
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4.98 3.5A2.48 2.48 0 1 0 5 8.46a2.48 2.48 0 0 0-.02-4.96zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.2c0-1.24-.02-2.84-1.73-2.84-1.74 0-2 1.35-2 2.75V21h-4V9z"
      fill="currentColor"
    />
  </svg>
  <span className={styles["social-text"]}>LinkedIn</span>
</a>



          </div>

          {/* small legal / small print on mobile under socials */}
          <div className={styles["small-note"]}>
            <p>
              Partnered stations across Australia.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom: copyright */}
      <div className={styles["footer-bottom"]}>
        <p>© {new Date().getFullYear()} Luggage Terminal. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
