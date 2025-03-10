"use client";
import React, { useState } from "react";
import "../../../public/ALL CSS/Input.css";
import Header from "../../components/Header.js";
import Payment from "../../components/Payment.js";

const LuggageBookingForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    dropOffDate: "",
    pickUpDate: "",
    luggageCount: 1,
    luggageSize: "Small",
    specialInstructions: "",
    termsAccepted: false,
  });

  const ratePerLuggagePerDay = 8; // Price per luggage per day

  // Function to calculate the number of days
  const calculateNumberOfDays = () => {
    if (!formData.dropOffDate || !formData.pickUpDate) return 1; // Default to 1 day if dates are empty

    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(formData.pickUpDate);
    const differenceInMs = pickUp - dropOff; // Time difference in milliseconds

    const numberOfDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24)); // Convert to full days

    return numberOfDays;
  };

  // Calculate total amount dynamically
  const numberOfDays = calculateNumberOfDays();
  const totalAmount = formData.luggageCount * numberOfDays * ratePerLuggagePerDay;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  

  const handlePaymentSuccess = async (paymentId) => {
    // Send booking email after payment is completed
    const response = await fetch("/api/booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...formData, paymentId }),
    });

    const data = await response.json();
    if (data.success) {
      alert("✅ Booking Confirmed! Email sent.");
    } else {
      alert("❌ Failed to send booking email.");
    }
  };

  return (
    <>
      <Header />
      <div className="booking-wrapper">
        <div className="booking-container">
          <h2>📦 Luggage Storage Booking</h2>
          <form>
            <div className="input-group">
              <label>👤 Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
            </div>
            <div className="double-input">
              <div className="input-group">
                <label>✉️ Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>📞 Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>

            <div className="double-input">
              <div className="input-group">
                <label>📅 Drop-off</label>
                <input type="datetime-local" name="dropOffDate" value={formData.dropOffDate} onChange={handleChange} required min={new Date().toISOString().slice(0, 16)} />
              </div>
              <div className="input-group">
                <label>📅 Pick-up</label>
                <input type="datetime-local" name="pickUpDate" value={formData.pickUpDate} onChange={handleChange} required min={formData.dropOffDate ? new Date(new Date(formData.dropOffDate).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)} />
              </div>
            </div>

            <div className="double-input">
              <div className="input-group">
                <label>🎒 Luggage Count</label>
                <input type="number" name="luggageCount" min="1" max="10" value={formData.luggageCount} onChange={handleChange} required />
              </div>
            </div>

            <div className="input-group">
              <label>📝 Special Instructions</label>
              <textarea name="specialInstructions" value={formData.specialInstructions} onChange={handleChange}></textarea>
            </div>

            <div className="checkbox-container">
              <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} required />
              <span>I agree to the terms and conditions</span>
            </div>
          </form>

          {/* Payment Button */}
          <Payment totalAmount={totalAmount} formData={formData} onSuccess={handlePaymentSuccess} />
        </div>
      </div>
    </>
  );
};

export default LuggageBookingForm;
