"use client";
import React, { useState, useEffect } from "react";
import "./key.css";
import "../../../public/ALL CSS/spinner.css";
import Header from "@/components/Header";
import PayPalPayment from "../../components/LuggagePay.js"; // ✅ reuse luggage PayPal
import Footer from "@/components/Footer";

const KeyHandoverForm = () => {
  const [formData, setFormData] = useState({
    dropOffName: "",
    dropOffEmail: "",
    pickUpName: "",
    pickUpEmail: "",
    dropOffDate: "",
    pickUpDate: "",
    stationId: "",
    termsAccepted: false,
  });

  const [stations, setStations] = useState([]);
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Success data object (station, dates, code, etc.)
  const [successData, setSuccessData] = useState(null);

  const keyRatePerDay = 9.99;

  // fetch stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/station/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setStations(data.stations || []);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      }
    };
    fetchStations();
  }, []);

  // calculate days between drop & pick
  const calculateNumberOfDays = () => {
    if (!formData.dropOffDate || !formData.pickUpDate) return 1;
    const dropOff = new Date(formData.dropOffDate);
    const pickUp = new Date(formData.pickUpDate);
    const diff = pickUp - dropOff;
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const numberOfDays = calculateNumberOfDays();
  const totalAmount = numberOfDays * keyRatePerDay;

  // handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // validation
  useEffect(() => {
    const errors = {};
    if (!formData.dropOffName) errors.dropOffName = "Drop-off name is required";
    if (!formData.pickUpName) errors.pickUpName = "Pick-up name is required";
    if (!formData.dropOffDate) errors.dropOffDate = "Drop-off date is required";
    if (!formData.pickUpDate) errors.pickUpDate = "Pick-up date is required";
    if (!formData.stationId) errors.stationId = "Please select a station";
    if (!formData.termsAccepted) errors.termsAccepted = "You must agree to the terms";

    if (formData.dropOffDate && formData.pickUpDate) {
      const dropOff = new Date(formData.dropOffDate);
      const pickUp = new Date(formData.pickUpDate);
      if (pickUp <= dropOff) {
        errors.pickUpDate = "Pick-up date must be after drop-off date";
      }
    }

    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [formData]);

  // when PayPal succeeds
  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/key-handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropOffPerson: { name: formData.dropOffName, email: formData.dropOffEmail },
          pickUpPerson: { name: formData.pickUpName, email: formData.pickUpEmail },
          dropOffDate: formData.dropOffDate,
          pickUpDate: formData.pickUpDate,
          stationId: formData.stationId,
          paymentId,
        }),
      });

      const data = await response.json();
      if (data.success && data.handover) {
        // ✅ Save all confirmation info
        const station = stations.find((s) => s._id === formData.stationId);
        setSuccessData({
          keyCode: data.handover.keyCode,
          dropOffDate: data.handover.dropOffDate,
          pickUpDate: data.handover.pickUpDate,
          station: station || null,
        });

        // ✅ Clear form
        setFormData({
          dropOffName: "",
          dropOffEmail: "",
          pickUpName: "",
          pickUpEmail: "",
          dropOffDate: "",
          pickUpDate: "",
          stationId: "",
          termsAccepted: false,
        });
      } else {
        alert("❌ Failed to complete key handover booking.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong while saving your booking.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="booking-wrapper">
        <div className="booking-container">
          <h2 className="booking-title">🔑 Key Handover Booking</h2>

          {/* ✅ If confirmation exists, show success message */}
          {successData ? (
            <div className="success-box">
              <h3>✅ Key Handover Confirmed!</h3>
              <p>
                Please share this pickup code <b>only with the pickup person</b>:
              </p>
              <div className="key-code">{successData.keyCode}</div>

              

              <div className="handover-dates">
                <p><strong>📍 Station:</strong> {successData.station?.name} ({successData.station?.location})</p>
                <p><strong>📅 Drop-off:</strong> {new Date(successData.dropOffDate).toLocaleDateString()}</p>
                <p><strong>📅 Pick-up:</strong> {new Date(successData.pickUpDate).toLocaleDateString()}</p>
              </div>

              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(successData.keyCode);
                  alert("Pickup code copied!");
                }}
              >
                Copy Code
              </button>
            </div>
          ) : (
            <>
              <form className="booking-form">
                {/* Drop-off person */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Drop-off Name</label>
                    <input
                      type="text"
                      name="dropOffName"
                      value={formData.dropOffName}
                      onChange={handleChange}
                      required
                    />
                    {errors.dropOffName && <span className="error">{errors.dropOffName}</span>}
                  </div>
                  <div className="form-group">
                    <label>Drop-off Email (optional)</label>
                    <input
                      type="email"
                      name="dropOffEmail"
                      value={formData.dropOffEmail}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Pick-up person */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Pick-up Name</label>
                    <input
                      type="text"
                      name="pickUpName"
                      value={formData.pickUpName}
                      onChange={handleChange}
                      required
                    />
                    {errors.pickUpName && <span className="error">{errors.pickUpName}</span>}
                  </div>
                  <div className="form-group">
                    <label>Pick-up Email (optional)</label>
                    <input
                      type="email"
                      name="pickUpEmail"
                      value={formData.pickUpEmail}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Drop-off Date</label>
                    <input
                      type="date"
                      name="dropOffDate"
                      value={formData.dropOffDate}
                      onChange={handleChange}
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                    {errors.dropOffDate && <span className="error">{errors.dropOffDate}</span>}
                  </div>
                  <div className="form-group">
                    <label>Pick-up Date</label>
                    <input
                      type="date"
                      name="pickUpDate"
                      value={formData.pickUpDate}
                      onChange={handleChange}
                      required
                      min={formData.dropOffDate || new Date().toISOString().split("T")[0]}
                    />
                    {errors.pickUpDate && <span className="error">{errors.pickUpDate}</span>}
                  </div>
                </div>

                {/* Station */}
                <div className="form-group">
                  <label>📍 Select Station</label>
                  <select
                    name="stationId"
                    value={formData.stationId}
                    onChange={handleChange}
                    required
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

                {/* Terms */}
                <div className="form-group checkbox-container">
                  <label>
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleChange}
                      required
                    />
                    I agree to the Terms and Conditions
                  </label>
                  {errors.termsAccepted && <span className="error">{errors.termsAccepted}</span>}
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
                <p className="error">Please fill out all required fields to continue.</p>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default KeyHandoverForm;
