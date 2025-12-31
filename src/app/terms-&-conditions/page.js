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
          <h1>Terms & Conditions</h1>

          <h3>1. Platform Role</h3>
          <p>
            Luggage Terminal operates as a booking and payment platform connecting
            users with independent luggage storage partners. Luggage Terminal
            does not own, operate, or control storage locations.
          </p>

          <h3>2. Bookings & Payments</h3>
          <ul>
            <li>Bookings are confirmed only after successful online payment.</li>
            <li>Prices are displayed per bag per day.</li>
            <li>Payments are processed via secure third-party providers.</li>
          </ul>

          <h3>3. Cancellation Policy</h3>
          <ul>
            <li>
              Free cancellation is available up to{" "}
              <strong>3 hours before</strong> drop-off.
            </li>
            <li>No refunds are issued after luggage is dropped off.</li>
            <li>No refunds for late cancellations or no-shows.</li>
          </ul>

          <h3>4. Prohibited Items</h3>
          <p>
            Users must not store prohibited items, including but not limited to:
            cash, passports, electronics, valuables, illegal or hazardous items,
            and perishables.
          </p>

          <h3>5. Liability Limitation</h3>
          <p>
            Luggage Terminal is not responsible for loss, theft, or damage
            occurring at partner locations. To the maximum extent permitted by
            law, any liability is limited to <strong>AUD 100 per booking</strong>.
          </p>

          <h3>6. User Conduct</h3>
          <p>
            Users must comply with all applicable laws and behave respectfully
            toward partner staff and property.
          </p>

          <h3>7. Termination</h3>
          <p>
            Luggage Terminal reserves the right to suspend or terminate access in
            cases of misuse, fraud, or policy violations.
          </p>

          <h3>8. Governing Law</h3>
          <p>
            These terms are governed by the laws of Australia.
          </p>

          <h3>9. Contact</h3>
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

export default TermsService;
