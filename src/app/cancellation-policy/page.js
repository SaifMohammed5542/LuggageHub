import React from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CancellationPolicy = () => {
  return (
    <>
      <Header />
      <div style={{ padding: '2rem', color: 'black' }}>
        <h1 style={{ color: '#235789' }}>Cancellation & Refund Policy</h1>
        <p>
          At Luggage Terminal, we understand that travel plans can change. 
          This Cancellation & Refund Policy explains how cancellations and refunds are handled 
          for bookings made through our platform.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>1. Cancellation by Customer</h3>
        <ul>
          <li>Cancellations made <strong>at least 24 hours before</strong> the booking start time will receive a full refund.</li>
    
          <li>No-shows without prior cancellation will not be eligible for a refund.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>2. Modification of Bookings</h3>
        <p>
          If you wish to modify your booking (date, time, or location), 
          please contact us at <strong>support@luggageterminal.com</strong>.  
          Changes are subject to availability and may incur additional charges.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>3. Cancellation by Luggage Terminal</h3>
        <p>
          In the rare event that we are unable to fulfill your booking due to unforeseen circumstances, 
          you will be notified immediately and offered either:
        </p>
        <ul>
          <li>A full refund, or</li>
          <li>An alternative booking option at no extra cost.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>4. Refund Processing</h3>
        <p>
          Approved refunds will be processed within <strong>5–7 business days </strong> 
           to the original method of payment.  
          Processing times may vary depending on your bank or payment provider.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>5. Contact Us</h3>
        <p>
          For cancellation or refund requests, please reach out to us at:<br/>
          📩 <strong>support@luggageterminal.com</strong>
        </p>
      </div>
      <Footer />
    </>
  );
};

export default CancellationPolicy;
