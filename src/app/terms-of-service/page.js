
import React from "react"
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsService= () =>{
    return (
        <>
        <Header />
        <div style={{ padding: '2rem', color: 'black'}}>
            <h1 style={{color: '#235789'}}>Terms and Conditions</h1>
            <p>1. Acceptance of Terms By using our website and services, you agree to comply with and be bound by the following terms and conditions.</p>
            <p>2. Booking and Payment</p>
            <ul>
                <li>Bookings are confirmed only after payment is completed.</li>
                <li>Users must select the correct storage details (date, time, luggage items) before proceeding with the payment.</li>
                <li>The payment for the storage service is non-refundable after the booking is confirmed.</li>
            </ul>
            <p>3. Liability</p>
            <ul>
                <li>We are not liable for any loss or damage to luggage stored at our facility.</li>
                <li>We will take reasonable precautions to safeguard your luggage, but liability is limited in accordance with our policies.</li>
            </ul>
            <p>4. Cancellation and Modifications</p>
            <ul>
                <li>Bookings can be modified or canceled within 12 hours before the scheduled storage date.</li>
                <li>Any modifications or cancellations made after this period may incur additional fees.</li>
            </ul>
            <p>5. Code of Conduct Users must respect our facilities and staff while using our services.</p>
            <p>6. Payments All payments are processed securely via third-party payment providers such as Razorpay. Your payment details are handled according to their privacy and security policies.</p>
            <p>7. Changes to Terms We reserve the right to update these terms at any time. Any changes will be posted on the website.</p>
            <p>8. Contact For questions or concerns, please contact us at luggage5542@gmail.com.</p>
        </div>
        <Footer />
        </>
    );
};
export default TermsService; 