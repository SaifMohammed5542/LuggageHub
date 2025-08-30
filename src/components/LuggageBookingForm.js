"use client";
import React, { useState, useEffect } from "react";
import "../../public/ALL CSS/Input.css";
import "../../public/ALL CSS/spinner.css";
import PayPalPayment from "./LuggagePay";
// import Header from "./Header";

const LuggageBookingForm = ({ prefilledStation = null }) => {
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
    stationId: "",
  });

  const [stations, setStations] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [hasSpecialInstructions, setHasSpecialInstructions] = useState(false);

  const ratePerLuggagePerDay = 7.99;

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("email");
    if (storedUsername && storedEmail) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        fullName: storedUsername,
        email: storedEmail,
      }));
      setIsUserLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/station/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setStations(data.stations);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      }
    };

    fetchStations();
  }, []);

  // Auto-select prefilled station if different
  useEffect(() => {
    if (prefilledStation?._id && prefilledStation._id !== formData.stationId) {
      setFormData((prev) => ({
        ...prev,
        stationId: prefilledStation._id,
      }));
    }
  }, [prefilledStation]);

  const calculateNumberOfDays = () => {
    if (!formData.dropOffDate || !formData.pickUpDate) return 1;
    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(formData.pickUpDate);
    const diffInMs = pickUp - dropOff;
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  };

  const numberOfDays = calculateNumberOfDays();
  const totalAmount = formData.luggageCount * numberOfDays * ratePerLuggagePerDay;

  // ✅ Updated handleChange to include +10 min logic (like direct form)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "dropOffDate" && value) {
      // Only set drop-off time if not already selected
      if (!formData.dropOffDate) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10); // Add 10 mins

        // Format for datetime-local in browser's local time
        const localISOTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);

        // keep user’s selected DATE but use +10 min as time
        updatedFormData.dropOffDate = `${value.slice(0, 10)}T${localISOTime.split("T")[1]}`;
      }

      // Pickup time = 4 hours after drop-off
      const dropOffTime = new Date(updatedFormData.dropOffDate || value);
      dropOffTime.setHours(dropOffTime.getHours() + 4);

      const localPickUpISO = new Date(
        dropOffTime.getTime() - dropOffTime.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);

      updatedFormData.pickUpDate = localPickUpISO;
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
    if (!formData.stationId) errors.stationId = "Please select a station";

    if (formData.dropOffDate && formData.pickUpDate) {
      const dropOff = new Date(formData.dropOffDate);
      const pickUp = new Date(formData.pickUpDate);
      const timeDifferenceInHours = (pickUp - dropOff) / (1000 * 60 * 60);
      if (timeDifferenceInHours < 1) {
        errors.pickUpDate = "Pick-up time must be at least 1 hour after drop-off.";
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

  const handleSpecialInstructionsChange = (e) => {
    setHasSpecialInstructions(e.target.checked);
  };

  return (
    <>
      {/* {!prefilledStation && <Header />} */}
      <div className="booking-wrapper">
        <div className="booking-container">
          <h2 className="booking-title">📦 Luggage Storage Booking</h2>

          {prefilledStation && (
            <div className="selected-station-banner">
              Booking for: <strong>{prefilledStation.name}</strong> (
              {prefilledStation.location})
            </div>
          )}

          <form className="booking-form">
            <div className="form-row">
              <div className="form-group">
                <label>👤 Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={isUserLoggedIn}
                />
                {errors.fullName && <span className="error">{errors.fullName}</span>}
              </div>
              <div className="form-group">
                <label>✉️ Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isUserLoggedIn}
                />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>📞 Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
                {errors.phone && <span className="error">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label>🎒 Luggage Count</label>
                <select
                  name="luggageCount"
                  value={formData.luggageCount}
                  onChange={handleChange}
                >
                  {[...Array(10).keys()].map((n) => (
                    <option key={n + 1} value={n + 1}>
                      {n + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>📅 Drop-off</label>
                <input
                  type="datetime-local"
                  name="dropOffDate"
                  value={formData.dropOffDate}
                  onChange={handleChange}
                  min={new Date().toISOString().slice(0, 16)}
                />
                {errors.dropOffDate && <span className="error">{errors.dropOffDate}</span>}
              </div>
              <div className="form-group">
                <label>📅 Pick-up</label>
                <input
                  type="datetime-local"
                  name="pickUpDate"
                  value={formData.pickUpDate}
                  onChange={handleChange}
                  min={
                    formData.dropOffDate
                      ? new Date(new Date(formData.dropOffDate).getTime() + 4 * 60 * 60 * 1000)
                          .toISOString()
                          .slice(0, 16)
                      : new Date().toISOString().slice(0, 16)
                  }
                />
                {errors.pickUpDate && <span className="error">{errors.pickUpDate}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>📍 Selected Station:</label>
              <select
                name="stationId"
                value={formData.stationId}
                onChange={handleChange}
                disabled={!!prefilledStation} // 🔒 disables dropdown if a station is prefilled
              >
                <option value="">-- Select a Station --</option>
                {stations.map((station) => (
                  <option key={station._id} value={station._id}>
                    {station.name} ({station.location})
                  </option>
                ))}
              </select>

              {errors.stationId && <span className="error">{errors.stationId}</span>}
            </div>

            <div className="checkbox-container">
              <input
                type="checkbox"
                id="hasSpecialInstructions"
                checked={hasSpecialInstructions}
                onChange={handleSpecialInstructionsChange}
              />
              <label htmlFor="hasSpecialInstructions">I have special instructions</label>
            </div>

            {hasSpecialInstructions && (
              <div className="form-group">
                <label>📝 Special Instructions</label>
                <select
                  name="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="Fragile items">Fragile items</option>
                  <option value="Oversized luggage">Oversized luggage</option>
                  <option value="Specific delivery time">Specific delivery time</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div className="form-group checkbox-container">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
              />
              <label>I agree to the terms and conditions</label>
              {errors.termsAccepted && (
                <span className="error">{errors.termsAccepted}</span>
              )}
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
            <PayPalPayment
              totalAmount={totalAmount}
              onPaymentSuccess={handlePaymentSuccess}
              formData={formData}
              disabled={isLoading}
            />
          ) : (
            <p className="error">
              Please fill out all required fields and agree to the terms.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default LuggageBookingForm;
