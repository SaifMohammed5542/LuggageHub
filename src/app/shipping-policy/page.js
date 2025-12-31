import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "@/styles/policy.module.css";

const ShippingPolicy = () => {
  return (
    <>
      <Header />

      <div className={styles.policyWrapper}>
        <div className={styles.policyPanel}>
          <h1>Shipping & Delivery Policy</h1>

          <p>
            Luggage Terminal does not ship physical products. All services
            provided are on-location services such as luggage storage.
          </p>

          <h3>Service Delivery</h3>
          <p>
            Upon successful booking and payment, customers receive an instant
            confirmation email. The service is delivered at the selected partner
            location during the booked time.
          </p>

          <h3>No Physical Shipping</h3>
          <p>
            No physical goods are shipped or delivered by Luggage Terminal.
          </p>

          <h3>Customer Responsibility</h3>
          <p>
            Customers must arrive on time and present their booking confirmation
            at the partner location.
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

export default ShippingPolicy;
