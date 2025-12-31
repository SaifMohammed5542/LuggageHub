import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "@/styles/policy.module.css";

const CancellationPolicy = () => {
  return (
    <>
      <Header />

      <div className={styles.policyWrapper}>
        <div className={styles.policyPanel}>
          <h1>Cancellation & Refund Policy</h1>

          <p>
            At Luggage Terminal, we understand that travel plans can change.
            This policy explains how cancellations and refunds are handled for
            bookings made through our platform.
          </p>

          <h3>1. Cancellation by Customer</h3>
          <ul>
            <li>
              Cancellations made at least <strong>3 hours before</strong> the
              scheduled drop-off time are eligible for a full refund.
            </li>
            <li>
              Cancellations made within <strong>3 hours of drop-off</strong> are
              not eligible for a refund.
            </li>
            <li>
              No-shows or failure to drop luggage during the booked time will
              not be refunded.
            </li>
          </ul>

          <h3>2. After Drop-Off</h3>
          <p>
            Once luggage has been dropped off at a partner location, the booking
            is considered active and <strong>no refunds</strong> will be issued.
          </p>

          <h3>3. Cancellation by Luggage Terminal</h3>
          <p>
            In rare cases where a booking cannot be fulfilled due to operational
            issues, customers will be offered either:
          </p>
          <ul>
            <li>A full refund, or</li>
            <li>An alternative storage location at no extra cost.</li>
          </ul>

          <h3>4. Refund Processing</h3>
          <p>
            Approved refunds are processed within{" "}
            <strong>5–7 business days</strong> to the original payment method.
            Processing time may vary depending on the payment provider.
          </p>

          <h3>5. Contact</h3>
          <p>
            For cancellation or refund requests, contact us at:<br />
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

export default CancellationPolicy;
