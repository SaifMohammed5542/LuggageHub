import React from 'react';
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const ShippingPolicy = () => {
  return (
    <>
      <Header />
      <div style={{ padding: '2rem', color: 'black' }}>
        <h1 style={{ color: '#235789' }}>Shipping & Service Delivery Policy</h1>
        <p>
          Luggage Terminal does not ship physical products. 
          Instead, we provide on-location services such as luggage storage and key handover 
          at the station selected during your booking.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>1. Booking Confirmation</h3>
        <p>
          Once your booking and payment are completed, you will receive a confirmation email 
          with your booking details. Please keep this confirmation for check-in at the station.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>2. Service Fulfilment</h3>
        <p>
          Our services are delivered at the exact location, date, and time you selected during booking. 
          Customers must arrive at the station and show their booking confirmation to access the service.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>3. No Physical Shipping</h3>
        <p>
          Since our services are location-based, no physical goods are shipped. 
          All bookings are service-only and fulfilled in person.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>4. Rescheduling & Changes</h3>
        <p>
          Customers can request rescheduling of services depending on availability. 
          For assistance, please contact us at <strong>support@luggageterminal.com</strong>.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>5. Support</h3>
        <p>
          For any issues regarding service delivery, please contact:<br/>
          📩 <strong>support@luggageterminal.com</strong>
        </p>
      </div>
      <Footer />
    </>
  );
};

export default ShippingPolicy;
