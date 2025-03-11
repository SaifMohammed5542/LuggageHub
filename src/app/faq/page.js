import React from 'react';
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const PrivacyPolicy = () => {
  return (
    <>
    <Header />
<div style={{ padding: '2rem', color: 'black'}}>
    <h1 style={{color: '#235789'}}>Frequently asked Questions</h1>
  <h3>1. How do I book a luggage storage spot?</h3>
  <p>To book a storage spot, select the date, time, and number of luggage items you need to store, then proceed to payment. Your booking will be confirmed once the payment is completed.</p>
  <h3>2. Is payment required in advance?</h3>
  <p>Yes, payment is required before confirming your booking.</p>
  <h3>3. Can I cancel or modify my booking?</h3>
  <p>You can cancel or modify your booking within 12 hours before the storage date. After this period, changes may incur additional charges.</p>
  <h3>4. What happens if my luggage is lost or damaged?</h3>
  <p>We take precautions to safeguard your luggage, but we are not liable for any loss or damage. Please ensure your items are appropriately packed.</p>
  <h3>5. How do I contact customer support?</h3>
  <p>You can contact us via email at luggage5542@gmail.com or through the contact form on our website.</p>
  <h3>6. Is my payment secure?</h3>
  <p>Yes, we use secure third-party payment processors to handle payments, ensuring your financial information is safe.</p>
  <h3>7. Can I extend my storage time?</h3>
  <p>You can extend your storage time by contacting us in advance. Additional charges may apply.</p>
</div>
    <Footer />
    </>
  );
};

export default PrivacyPolicy;