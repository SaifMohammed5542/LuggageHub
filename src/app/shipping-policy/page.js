import React from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ShippingPolicy = () => {
  return (
    <>
      <Header />
      <div style={{ padding: '2rem', color: 'black' }}>
        <h1 style={{ color: '#235789' }}>Shipping & Delivery Policy</h1>
        <p>
          Luggage Terminal does not ship physical products. 
          All services provided through our platform are digital bookings and 
          on-location services such as luggage storage and key handover.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>1. Service Delivery</h3>
        <p>
          Upon successful booking and payment, customers will receive an 
          <strong> instant email confirmation</strong> with their booking details. 
          The booked service is delivered at the selected station/location on the 
          date and time chosen by the customer.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>2. No Physical Shipping</h3>
        <p>
          Since our business is service-based, we do not ship or deliver 
          any physical goods. The term “Shipping” refers only to the 
          confirmation and fulfillment of booked services.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>3. Customer Responsibilities</h3>
        <p>
          Customers must arrive at the booked station on time and show their 
          booking confirmation to access the service.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>4. Delivery Issues</h3>
        <p>
          In case of any issues with service fulfillment, please contact us immediately 
          at <strong>support@luggageterminal.com</strong>. Our support team will assist you promptly.
        </p>

        <h3 style={{ marginTop: '1.5rem', color: '#235789' }}>5. Contact</h3>
        <p>
          For any questions about our Shipping & Delivery Policy, please contact us:<br />
          📩 <strong>support@luggageterminal.com</strong>
        </p>
      </div>
      <Footer />
    </>
  );
};

export default ShippingPolicy;
