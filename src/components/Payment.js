import React, { useEffect } from "react";

const Payment = ({ totalAmount }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePayment = () => {
    const options = {
      key: "rzp_test_KNRKHAUt7KeQWE", // Replace with your Razorpay Key ID
      amount: totalAmount * 100, // Amount in paise (50000 paise = ₹500)
      currency: "INR",
      name: "Luggage Storage",
      description: "Luggage Booking Payment",
      image: "https://yourlogo.com/logo.png", // Optional logo
      handler: function (response) {
        alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
      },
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
        contact: "9999999999",
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <button
      onClick={handlePayment}
      style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
    >
      Pay Now
    </button>
  );
};

export default Payment;
