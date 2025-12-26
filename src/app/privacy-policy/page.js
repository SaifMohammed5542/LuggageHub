import React from 'react';
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

          <h3>1. Introduction</h3>
          <p>
            We value your privacy and are committed to protecting your personal data. 
            This Privacy Policy outlines how we collect, use, and safeguard your 
            information when you use our website and services.
          </p>

          <h3>2. Information We Collect</h3>
          <p>We may collect personal information such as:</p>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Payment details (handled securely through payment providers)</li>
            <li>Booking details (date, time, number of luggage items)</li>
          </ul>

          <h3>3. How We Use Your Information</h3>
          <p>We use your information to:</p>
          <ul>
            <li>Process bookings and payments</li>
            <li>Communicate booking confirmations and updates</li>
            <li>Improve our services</li>
            <li>Prevent fraudulent activities</li>
          </ul>

          <h3>4. Data Security</h3>
          <p>
            We implement appropriate security measures to protect your data. 
            All payments are processed through secure, third-party payment providers.
          </p>

          <h3>5. Sharing of Information</h3>
          <p>
            We will not share your personal data with third parties, except as 
            necessary to complete your booking or as required by law.
          </p>

          <h3>6. Cookies</h3>
          <p>
            Our website uses cookies to enhance user experience. You can disable 
            cookies through your browser settings.
          </p>

          <h3>7. Changes to This Policy</h3>
          <p>
            We reserve the right to modify this policy at any time. Changes will 
            be posted on this page.
          </p>

          <h3>8. Contact Us</h3>
          <p>
            If you have any questions about this Privacy Policy, please contact us at{' '}
              Email:{" "}
              <a
                href="mailto:support@luggageterminal.com"
                className={styles["mailto"]}
              >
                              <strong>
                support@luggageterminal.com
              </strong>
              </a>
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default PrivacyPolicy;