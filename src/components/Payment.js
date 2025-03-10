import React, { useEffect } from "react";

const Payment = ({ totalAmount, formData, onSuccess, onPaymentSuccess }) => {
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayment = () => {

    if (!formData || !formData.fullName || !formData.email || !formData.phone) {
      alert("Please fill in all required fields before making a payment.");
      return;
    }



    const options = {
      key: "rzp_test_KNRKHAUt7KeQWE", // Replace with your Razorpay Key ID
      amount: totalAmount * 100, // Amount in paise (50000 paise = ₹500)
      currency: "AUD",
      name: "Luggage Storage",
      description: "Luggage Booking Payment",
      image: "https://yourlogo.com/logo.png", // Optional logo
      handler: async function (response) {
        alert(`✅ Payment successful! Payment ID: ${response.razorpay_payment_id}`);
        onSuccess(response.razorpay_payment_id);

        // Send booking details to backend after successful payment
        const bookingData = { ...formData, paymentId: response.razorpay_payment_id };

        try {
          const res = await fetch("/api/booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookingData),
          });

          const data = await res.json();
          if (data.success) {
            alert("🎉 Booking Confirmed! Email sent.");
            if (onPaymentSuccess) onPaymentSuccess(); // Callback for additional actions
          } else {
            alert("❌ Booking confirmation failed.");
          }
        } catch (error) {
          console.error("Error confirming booking:", error);
          alert("❌ Network error. Please try again.");
        }
      },
      prefill: {
        name: formData.fullName || "Customer Name",
        email: formData.email || "customer@example.com",
        contact: formData.phone || "9999999999",
      },
      theme: { color: "#3399cc" },
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
