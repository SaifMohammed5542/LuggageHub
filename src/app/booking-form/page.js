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


  const [hasSpecialInstructions, setHasSpecialInstructions] = useState(false);

    const handleSpecialInstructionsChange = (e) => {
        setHasSpecialInstructions(e.target.checked);
    };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("email");
    if (storedUsername && storedEmail) {
      setFormData((prevFormData) => ({ ...prevFormData, fullName: storedUsername, email: storedEmail }));
    }
  }, []);

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
    const updatedFormData = { ...formData, [name]: type === "checkbox" ? checked : value };
    if (name === "dropOffDate" && value) {
      const dropOffTime = new Date(value);
      const pickUpTime = new Date(dropOffTime.getTime() + 4 * 60 * 60 * 1000);
      const timezoneOffset = dropOffTime.getTimezoneOffset() * 60 * 1000;
      const adjustedPickUpTime = new Date(pickUpTime.getTime() - timezoneOffset);
      updatedFormData.pickUpDate = adjustedPickUpTime.toISOString().slice(0, 16);
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
      if (timeDifferenceInHours < 1) errors.pickUpDate = "Pick-up time must be at least 1 hour after drop-off time.";
    }
    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [formData]);

  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, paymentId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send booking details.");
      }
      const data = await response.json();
      if (data.success) window.location.href = "/Booked";
      else alert("❌ Failed to send booking email.");
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
          <h2 className="booking-title">📦 Luggage Storage Booking</h2>
          <form className="booking-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">👤 Full Name</label>
                <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} disabled={!!formData.fullName} required />
                {errors.fullName && <span className="error">{errors.fullName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="email">✉️ Email</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} disabled={!!formData.email} required />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">📞 Phone</label>
                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
                {errors.phone && <span className="error">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="luggageCount">🎒 Luggage Count</label>
                <select id="luggageCount" name="luggageCount" value={formData.luggageCount} onChange={handleChange} required>
                  {[...Array(10).keys()].map((num) => (
                    <option key={num + 1} value={num + 1}>
                      {num + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dropOffDate">📅 Drop-off</label>
                <input type="datetime-local" id="dropOffDate" name="dropOffDate" value={formData.dropOffDate} onChange={handleChange} required min={new Date().toISOString().slice(0, 16)} />
                {errors.dropOffDate && <span className="error">{errors.dropOffDate}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="pickUpDate">📅 Pick-up</label>
                <input type="datetime-local" id="pickUpDate" name="pickUpDate" value={formData.pickUpDate} onChange={handleChange} required min={formData.dropOffDate ? new Date(new Date(formData.dropOffDate).getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)} />
                {errors.pickUpDate && <span className="error">{errors.pickUpDate}</span>}
              </div>
            </div>
            <div className="checkbox-container">
                            <input
                                type="checkbox"
                                id="hasSpecialInstructions"
                                name="hasSpecialInstructions"
                                checked={hasSpecialInstructions}
                                onChange={handleSpecialInstructionsChange}
                            />
                            <label htmlFor="hasSpecialInstructions">I have special instructions</label>
                        </div>

                        {hasSpecialInstructions && (
                            <div className="input-group">
                                <label>📝 Special Instructions</label>
                                <select
                                    name="specialInstructions"
                                    value={formData.specialInstructions}
                                    onChange={handleChange}
                                >
                                    <option value="">Select instructions</option>
                                    <option value="Fragile items">Fragile items</option>
                                    <option value="Oversized luggage">Oversized luggage</option>
                                    <option value="Specific delivery time">Specific delivery time</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        )}
            <div className="form-group">
              <div className="checkbox-container">
                <input type="checkbox" id="termsAccepted" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} required />
                <label htmlFor="termsAccepted">I agree to the terms and conditions</label>
                {errors.termsAccepted && <span className="error">{errors.termsAccepted}</span>}
              </div>
            </div>
          </form>
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