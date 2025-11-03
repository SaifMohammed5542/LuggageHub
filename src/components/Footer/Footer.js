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
              <Link href="/contact-us" className={styles.link}>
                Contact Us
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
              <Link href="/shipping-policy" className={styles.link}>
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className={styles.link}>
                Terms of Service
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
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Luggage Terminal on Facebook"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07C2 17.09 5.66 21.2 10.44 22v-7.03H8.07v-2.9h2.37V9.4c0-2.35 1.4-3.64 3.54-3.64 1.02 0 2.09.18 2.09.18v2.3h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.9h-2.18V22C18.34 21.2 22 17.09 22 12.07z"
                  fill="currentColor"
                />
              </svg>
              <span className={styles["social-text"]}>Facebook</span>
            </a>

            <a
              className={styles["social-btn"]}
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Luggage Terminal on Twitter"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M22 5.92c-.63.28-1.3.47-2 .56.72-.43 1.27-1.1 1.53-1.9-.67.4-1.42.7-2.21.86C18.6 4.6 17.6 4 16.46 4c-1.54 0-2.8 1.24-2.8 2.77 0 .22.02.44.07.64C10.8 7.31 8.1 6 6.25 4.04c-.25.43-.4.92-.4 1.45 0 .96.5 1.8 1.26 2.3-.47-.02-.9-.15-1.28-.36v.04c0 1.33.95 2.45 2.2 2.7-.23.07-.47.11-.72.11-.18 0-.36-.02-.53-.05.36 1.12 1.4 1.93 2.63 1.95-0.96.75-2.18 1.2-3.5 1.2H6c1.9 1.22 4.15 1.92 6.57 1.92 7.9 0 12.22-6.66 12.22-12.44v-.57C21.11 7.3 21.62 6.66 22 5.92z"
                  fill="currentColor"
                />
              </svg>
              <span className={styles["social-text"]}>Twitter</span>
            </a>


          </div>

          {/* small legal / small print on mobile under socials */}
          <div className={styles["small-note"]}>
            <p>
              Partnered stations across Australia. Operates in AUD. Proprietor:
              Luggage Terminal.
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
