"use client";
import React, { useState, useEffect } from "react";
import "../../../public/ALL CSS/Input.css";
import '../../../public/ALL CSS/spinner.css'
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

  const [isFormValid, setIsFormValid] = useState(false); // Track form validity
  const [errors, setErrors] = useState({}); // Track validation errors
  const [isLoading, setIsLoading] = useState(false); // Track loading state

  const ratePerLuggagePerDay = 7.99; // Price per luggage per day

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

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    // Automatically adjust pick-up time if drop-off time changes
    if (name === "dropOffDate" && value) {
      const dropOffTime = new Date(value);
      const minPickUpTime = new Date(dropOffTime.getTime() + 60 * 60 * 1000); // 1 hour later
      updatedFormData.pickUpDate = minPickUpTime.toISOString().slice(0, 16); // Set pick-up time to 1 hour after drop-off
    }

    setFormData(updatedFormData);
  };

  // Validate the form whenever formData changes
  useEffect(() => {
    const errors = {};

    // Check each field for errors
    if (!formData.fullName) errors.fullName = "Full Name is required";
    if (!formData.email) errors.email = "Email is required";
    if (!formData.phone) errors.phone = "Phone is required";
    if (!formData.dropOffDate) errors.dropOffDate = "Drop-off Date is required";
    if (!formData.pickUpDate) errors.pickUpDate = "Pick-up Date is required";
    if (!formData.termsAccepted) errors.termsAccepted = "You must agree to the terms";

    // Validate drop-off and pick-up times
    if (formData.dropOffDate && formData.pickUpDate) {
      const dropOff = new Date(formData.dropOffDate);
      const pickUp = new Date(formData.pickUpDate);
      const timeDifferenceInHours = (pickUp - dropOff) / (1000 * 60 * 60); // Difference in hours

      if (timeDifferenceInHours < 1) {
        errors.pickUpDate = "Pick-up time must be at least 1 hour after drop-off time.";
      }
    }

    // Update errors and form validity
    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);

    // Debugging logs
    console.log("Form Data:", JSON.stringify(formData, null, 2)); // Show full form data
    console.log("Errors:", JSON.stringify(errors, null, 2)); // Show full errors
    console.log("Is Form Valid:", Object.keys(errors).length === 0);
  }, [formData]);

  // Handle payment success
  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true); // Start loading
    try {
      // Send booking email after payment is completed
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, paymentId }),
      });

      // Check if the response is OK
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send booking details.");
      }

      // Parse the response as JSON
      const data = await response.json();

      // Handle the response
      if (data.success) {
        // Redirect to the confirmation page
        window.location.href = "/Booked";
      } else {
        alert("❌ Failed to send booking email.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  return (
    <>
      <Header />
      <div className="booking-wrapper">
        <div className="booking-container">
          <h2>📦 Luggage Storage Booking</h2>
          <form>
            {/* Full Name */}
            <div className="input-group">
              <label>👤 Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
              {errors.fullName && <span className="error">{errors.fullName}</span>}
            </div>

            {/* Email and Phone */}
            <div className="double-input">
              <div className="input-group">
                <label>✉️ Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
              <div className="input-group">
                <label>📞 Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                {errors.phone && <span className="error">{errors.phone}</span>}
              </div>
            </div>

            {/* Drop-off and Pick-up */}
            <div className="double-input">
              <div className="input-group">
                <label>📅 Drop-off</label>
                <input
                  type="datetime-local"
                  name="dropOffDate"
                  value={formData.dropOffDate}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
                {errors.dropOffDate && <span className="error">{errors.dropOffDate}</span>}
              </div>
              <div className="input-group">
                <label>📅 Pick-up</label>
                <input
                  type="datetime-local"
                  name="pickUpDate"
                  value={formData.pickUpDate}
                  onChange={handleChange}
                  required
                  min={
                    formData.dropOffDate
                      ? new Date(new Date(formData.dropOffDate).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16)
                      : new Date().toISOString().slice(0, 16)
                  }
                />
                {errors.pickUpDate && <span className="error">{errors.pickUpDate}</span>}
              </div>
            </div>

            {/* Luggage Count */}
            <div className="double-input">
  <div className="input-group">
    <label>🎒 Luggage Count</label>
    <select
      name="luggageCount"
      value={formData.luggageCount}
      onChange={handleChange}
      required
    >
      {[...Array(10).keys()].map((num) => {
        const value = num + 1; // Ensures the range is 1 to 10
        return (
          <option key={value} value={value}>
            {value}
          </option>
        );
      })}
    </select>
  </div>
</div>


            {/* Special Instructions */}
            <div className="input-group">
              <label>📝 Special Instructions</label>
              <textarea
                name="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleChange}
              ></textarea>
            </div>

            {/* Terms and Conditions */}
            <div className="checkbox-container">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                required
              />
              <span>I agree to the terms and conditions</span>
              {errors.termsAccepted && <span className="error">{errors.termsAccepted}</span>}
            </div>
          </form>

          {/* Render PayPal button or loading spinner */}
          {isLoading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Processing your booking...</p>
            </div>
          ) : isFormValid ? (
            <PayPalPayment
              totalAmount={totalAmount}
              onPaymentSuccess={handlePaymentSuccess}
              disabled={isLoading} // Disable the button when loading
            />
          ) : (
            <p className="error">Please fill out all required fields and agree to the terms to continue.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default LuggageBookingForm;