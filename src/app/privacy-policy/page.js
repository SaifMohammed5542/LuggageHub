import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "@/styles/policy.module.css";

const PrivacyPolicy = () => {
  return (
    <>
      <Header />

      <div className={styles.policyWrapper}>
        <div className={styles.policyPanel}>
          <h1>Privacy Policy</h1>

          <p>
            Luggage Terminal is committed to protecting your privacy. This policy
            explains how we collect, use, and protect your personal information.
          </p>

          <h3>Information We Collect</h3>
          <ul>
            <li>Name, email address, and phone number</li>
            <li>Booking details (date, time, location, number of bags)</li>
            <li>Payment information (processed securely by payment providers)</li>
          </ul>

          <h3>How We Use Information</h3>
          <ul>
            <li>Process bookings and payments</li>
            <li>Send confirmations and service updates</li>
            <li>Prevent fraud and misuse</li>
          </ul>

          <h3>Data Sharing</h3>
          <p>
            We do not sell personal data. Information is shared only with storage
            partners as required to fulfill bookings or when legally required.
          </p>

          <h3>Security</h3>
          <p>
            Payments are handled by secure third-party providers. We take
            reasonable measures to protect your data.
          </p>

          <h3>Contact</h3>
          <p>
            📩{" "}
            <strong>
              <a
                href="mailto:support@luggageterminal.com"
                className={styles.mailto}
              >
                support@luggageterminal.com
              </a>
            </strong>
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default PrivacyPolicy;
