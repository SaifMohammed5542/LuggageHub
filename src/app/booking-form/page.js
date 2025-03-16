"use client";
import React, { useState, useEffect } from "react";
import "../../../public/ALL CSS/Input.css";
import "../../../public/ALL CSS/spinner.css";
import Header from "../../components/Header.js";
import PayPalPayment from "../../components/checkoutbutton.js";

const LuggageBookingForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dropOffDate: "",
    pickUpDate: "",
    luggageCount: 1,
    luggageSize: "Small",
    specialInstructions: "",
    termsAccepted: false,
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const ratePerLuggagePerDay = 7.99;

  const calculateNumberOfDays = () => {
    if (!formData.dropOffDate || !formData.pickUpDate) return 1;
    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(formData.pickUpDate);
    const differenceInMs = pickUp - dropOff;
    return Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
  };

  const numberOfDays = calculateNumberOfDays();
  const totalAmount = formData.luggageCount * numberOfDays * ratePerLuggagePerDay;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "dropOffDate" && value) {
      const dropOffTime = new Date(value);
      const minPickUpTime = new Date(dropOffTime.getTime() + 60 * 60 * 1000);
      updatedFormData.pickUpDate = minPickUpTime.toISOString().slice(0, 16);
    }

    setFormData(updatedFormData);
  };

  useEffect(() => {
    const errors = {};

    if (!formData.fullName) errors.fullName = "Full Name is required";
    if (!formData.email) errors.email = "Email is required";
    if (!formData.phone) errors.phone = "Phone is required";
    if (!formData.dropOffDate) errors.dropOffDate = "Drop-off Date is required";
    if (!formData.pickUpDate) errors.pickUpDate = "Pick-up Date is required";
    if (!formData.termsAccepted) errors.termsAccepted = "You must agree to the terms";

    if (formData.dropOffDate && formData.pickUpDate) {
      const dropOff = new Date(formData.dropOffDate);
      const pickUp = new Date(formData.pickUpDate);
      const timeDifferenceInHours = (pickUp - dropOff) / (1000 * 60 * 60);

      if (timeDifferenceInHours < 1) {
        errors.pickUpDate = "Pick-up time must be at least 1 hour after drop-off time.";
      }
    }

    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [formData]);

  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, paymentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send booking details.");
      }

      const data = await response.json();

      if (data.success) {
        window.location.href = "/Booked";
      } else {
        alert("❌ Failed to send booking email.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
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
              {errors.fullName && <span className="error">{errors.fullName}</span>}
            </div>

            <div className="double-input">
              <div className="input-group">
                <label>✉️ Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
              <div className="input-group">
                <label>📞 Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                {errors.phone && <span className="error">{errors.phone}</span>}
              </div>
            </div>

            <div className="double-input">
              <div className="input-group">
                <label>📅 Drop-off</label>
                <input type="datetime-local" name="dropOffDate" value={formData.dropOffDate} onChange={handleChange} required min={new Date().toISOString().slice(0, 16)} />
                {errors.dropOffDate && <span className="error">{errors.dropOffDate}</span>}
              </div>
              <div className="input-group">
                <label>📅 Pick-up</label>
                <input type="datetime-local" name="pickUpDate" value={formData.pickUpDate} onChange={handleChange} required min={formData.dropOffDate ? new Date(new Date(formData.dropOffDate).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)} />
                {errors.pickUpDate && <span className="error">{errors.pickUpDate}</span>}
              </div>
            </div>

            <div className="double-input">
              <div className="input-group">
                <label>🎒 Luggage Count</label>
                <input
                  type="number"
                  name="luggageCount"
                  min="1"
                  max="10"
                  value={formData.luggageCount}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>


            <div className="input-group">
              <label>📝 Special Instructions</label>
              <textarea name="specialInstructions" value={formData.specialInstructions} onChange={handleChange}></textarea>
            </div>

            <div className="checkbox-container">
              <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} required />
              <span>I agree to the terms and conditions</span>
              {errors.termsAccepted && <span className="error">{errors.termsAccepted}</span>}
            </div>
          </form>

          {/* Total Amount Display */}
          <div className="total-amount">
            <h3>Total Amount: A${totalAmount.toFixed(2)}</h3>
          </div>

          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Processing your booking...</p>
            </div>
          ) : isFormValid ? (
            <PayPalPayment totalAmount={totalAmount} onPaymentSuccess={handlePaymentSuccess} disabled={isLoading} />
          ) : (
            <p className="error">Please fill out all required fields and agree to the terms to continue.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default LuggageBookingForm;
