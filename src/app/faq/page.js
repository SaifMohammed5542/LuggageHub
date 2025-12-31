import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "@/styles/policy.module.css";

const FAQ = () => {
  return (
    <>
      <Header />

      <div className={styles.policyWrapper}>
        <div className={styles.policyPanel}>
          <h1>Frequently Asked Questions</h1>

          <h3>1. What is Luggage Terminal?</h3>
          <p>
            Luggage Terminal is a booking platform that connects travelers with
            independent luggage storage partners. We do not own or operate
            storage locations.
          </p>

          <h3>2. How do I book luggage storage?</h3>
          <p>
            Select your location, date, time, and number of bags, then complete
            payment online. Your booking is confirmed immediately after payment.
          </p>

          <h3>3. Is payment required in advance?</h3>
          <p>Yes. All bookings must be paid online to be confirmed.</p>

          <h3>4. Can I cancel my booking?</h3>
          <p>
            Yes. You may cancel your booking up to{" "}
            <strong>3 hours before</strong> the scheduled drop-off time for a
            full refund.
          </p>

          <h3>5. What happens if I cancel late or don’t show up?</h3>
          <p>
            Cancellations made within 3 hours of drop-off or no-shows are not
            eligible for a refund.
          </p>

          <h3>6. What if my luggage is lost or damaged?</h3>
          <p>
            Luggage Terminal is not responsible for loss or damage occurring at
            partner locations. Responsibility lies with the independent storage
            provider.
          </p>

          <h3>7. Are there items I should not store?</h3>
          <p>
            Yes. Prohibited items include valuables, electronics, passports,
            cash, illegal or hazardous items, and perishables.
          </p>

          <h3>8. Is my payment secure?</h3>
          <p>
            Yes. Payments are processed via secure third-party payment providers.
            Luggage Terminal does not store card details.
          </p>

          <h3>9. How can I contact support?</h3>
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

export default FAQ;
