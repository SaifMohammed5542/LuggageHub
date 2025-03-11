import React from 'react';
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const PrivacyPolicy = () => {
  return (
    <>
    <Header />
    <div style={{ padding: '2rem', color: 'black'}}>
      <h1 style={{color: '#235789'}}>Privacy Policy</h1>
      <p>1. Introduction We value your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, use, and safeguard your information when you use our website and services.</p>
      <p>2. Information We Collect We may collect personal information such as:</p>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Payment details (handled securely through payment providers)</li>
        <li>Booking details (date, time, number of luggage items)</li>
      </ul>
      <p>3. How We Use Your Information We use your information to:</p>
      <ul>
        <li>Process bookings and payments</li>
        <li>Communicate booking confirmations and updates</li>
        <li>Improve our services</li>
        <li>Prevent fraudulent activities</li>
      </ul>
      <p>4. Data Security We implement appropriate security measures to protect your data. All payments are processed through secure, third-party payment providers.</p>
      <p>5. Sharing of Information We will not share your personal data with third parties, except as necessary to complete your booking or as required by law.</p>
      <p>6. Cookies Our website uses cookies to enhance user experience. You can disable cookies through your browser settings.</p>
      <p>7. Changes to This Policy We reserve the right to modify this policy at any time. Changes will be posted on this page.</p>
      <p>8. Contact Us If you have any questions about this Privacy Policy, please contact us at luggage5542@gmail.com.</p>
    </div>
    <Footer />
    </>
  );
};

export default PrivacyPolicy;