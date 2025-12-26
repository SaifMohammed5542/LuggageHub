import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "@/styles/policy.module.css";

const TermsService = () => {
  return (
    <>
      <Header />
      
      <div className={styles.policyWrapper}>
        <div className={styles.policyPanel}>
          <h1>Terms and Conditions</h1>

          <h3>1. Acceptance of Terms</h3>
          <p>
            By using our website and services, you agree to comply with and be bound 
            by the following terms and conditions.
          </p>

          <h3>2. Booking and Payment</h3>
          <ul>
            <li>Bookings are confirmed only after payment is completed.</li>
            <li>
              Users must select the correct storage details (date, time, luggage items) 
              before proceeding with the payment.
            </li>
            <li>
              The payment for the storage service is non-refundable after the booking 
              is confirmed.
            </li>
          </ul>

          <h3>3. Liability</h3>
          <ul>
            <li>
              We are not liable for any loss or damage to luggage stored at our facility.
            </li>
            <li>
              We will take reasonable precautions to safeguard your luggage, but liability 
              is limited in accordance with our policies.
            </li>
          </ul>

          <h3>4. Cancellation and Modifications</h3>
          <ul>
            <li>
              Bookings can be modified or canceled within 12 hours before the scheduled 
              storage date.
            </li>
            <li>
              Any modifications or cancellations made after this period may incur 
              additional fees.
            </li>
          </ul>

          <h3>5. Code of Conduct</h3>
          <p>
            Users must respect our facilities and staff while using our services.
          </p>

          <h3>6. Payments</h3>
          <p>
            All payments are processed securely via third-party payment providers such 
            as <strong>Razorpay</strong>. Your payment details are handled according to 
            their privacy and security policies.
          </p>

          <h3>7. Changes to Terms</h3>
          <p>
            We reserve the right to update these terms at any time. Any changes will 
            be posted on the website.
          </p>

          <h3>8. Contact</h3>
          <p>
            For cancellation or refund requests, please reach out to us at:<br />
            📩 <strong>
              Email:{" "}
              <a
                href="mailto:support@luggageterminal.com"
                className={styles["mailto"]}
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

export default TermsService;