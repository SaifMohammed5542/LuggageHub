"use client";
import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import PayPalCheckout from "../../components/KeyPay";
import "./key.css";

export default function KeyHandoverForm() {
  const [formData, setFormData] = useState({
    dropOffName: "",
    dropOffEmail: "",
    pickUpName: "",
    pickUpEmail: "",
    dropOffDate: "",
    pickUpDate: "",
    stationId: "",
  });

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);

  const today = new Date().toISOString().split("T")[0]; // Today's date in yyyy-mm-dd

  useEffect(() => {
    async function loadStations() {
      try {
        const res = await fetch("/api/station/list");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setStations(data.stations || []);
      } catch (err) {
        console.error("Could not load stations:", err);
        setResult("❌ Unable to load stations. Try again later.");
      }
    }
    loadStations();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (!formData.dropOffName || !formData.pickUpName || !formData.stationId) {
      setResult("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    const dropDate = new Date(formData.dropOffDate);
    const pickDate = new Date(formData.pickUpDate);
    const now = new Date(today);

    if (dropDate < now) {
      setResult("❌ Drop-off date cannot be in the past.");
      setLoading(false);
      return;
    }

    if (pickDate <= dropDate) {
      setResult("❌ Pick-up date must be after drop-off date.");
      setLoading(false);
      return;
    }

    setPendingFormData(formData);

    // Calculate number of days between drop-off and pick-up
    const timeDiff = pickDate.getTime() - dropDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Amount calculation: $3 per day
    const amount = daysDiff * 3;
    setPaymentAmount(amount.toFixed(2));
    setPaymentStatus("pending");

    setLoading(false);
  };

  const handlePaymentSuccess = async (details) => {
    if (!pendingFormData) {
      console.error("No pending form data available.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/key-handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropOffPerson: { name: pendingFormData.dropOffName, email: pendingFormData.dropOffEmail },
          pickUpPerson: { name: pendingFormData.pickUpName, email: pendingFormData.pickUpEmail },
          dropOffDate: pendingFormData.dropOffDate,
          pickUpDate: pendingFormData.pickUpDate,
          stationId: pendingFormData.stationId,
          paymentId: details.id,
          paymentStatus: "completed",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPaymentStatus("completed");
        setResult(`✅ Booking successful! Share this pickup code: ${data.handover.keyCode}`);
      } else {
        setPaymentStatus("failed");
        setResult(data.message || "❌ Booking failed after payment. Please contact support.");
      }
    } catch (err) {
      console.error("Payment success handling error:", err);
      setPaymentStatus("failed");
      setResult("❌ Error during booking after payment.");
    } finally {
      setLoading(false);
      setPendingFormData(null);
    }
  };

  return (
    <>
      <Header />
      <PayPalScriptProvider options={{ "client-id": "Aboo23AYFeclfVf1t3LP7pa-jMK55lgOiUK5ngc1CmEb0fWh7G55DxwckrCxxoqvBNVPsWuWvO5sZc9o", currency: "AUD", locale: "en_AU" }}>
        <div className="handover-form-container">
          <h1 className="handover-form-title">Key Handover Booking 🔑</h1>

          <form onSubmit={handleSubmit} className="handover-form">
            {/* Drop-off Person */}
            <div className="form-section">
              <h3 className="form-section-title">Drop-off Person</h3>
              <input
                className="form-input"
                type="text"
                name="dropOffName"
                placeholder="Full Name"
                value={formData.dropOffName}
                onChange={handleChange}
                required
              />
              <input
                className="form-input"
                type="email"
                name="dropOffEmail"
                placeholder="Email (optional)"
                value={formData.dropOffEmail}
                onChange={handleChange}
              />
            </div>

            {/* Pick-up Person */}
            <div className="form-section">
              <h3 className="form-section-title">Pick-up Person</h3>
              <input
                className="form-input"
                type="text"
                name="pickUpName"
                placeholder="Full Name"
                value={formData.pickUpName}
                onChange={handleChange}
                required
              />
              <input
                className="form-input"
                type="email"
                name="pickUpEmail"
                placeholder="Email (optional)"
                value={formData.pickUpEmail}
                onChange={handleChange}
              />
            </div>

            {/* Dates */}
            <div className="form-group">
              <label className="form-label">Drop-off Date:</label>
              <input
                className="form-input"
                type="date"
                name="dropOffDate"
                value={formData.dropOffDate}
                onChange={handleChange}
                min={today}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pick-up Date:</label>
              <input
                className="form-input"
                type="date"
                name="pickUpDate"
                value={formData.pickUpDate}
                onChange={handleChange}
                min={formData.dropOffDate || today}
                required
              />
            </div>

            {/* Station dropdown */}
            <div className="form-group">
              <label className="form-label">Station:</label>
              <select
                className="form-input"
                name="stationId"
                value={formData.stationId}
                onChange={handleChange}
                required
              >
                <option value="">-- Select a station --</option>
                {stations.map((station) => (
                  <option key={station._id} value={station._id}>
                    {station.name} — {station.location || ""}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="submit-button" disabled={loading || paymentStatus === "pending"}>
              {loading ? "Processing…" : "Book Key Handover"}
            </button>

            {/* PayPal Checkout */}
            {paymentStatus === "pending" && paymentAmount && (
              <PayPalCheckout amount={paymentAmount} onSuccess={handlePaymentSuccess} />
            )}

            {result && <div className="result-message">{result}</div>}
          </form>
        </div>
      </PayPalScriptProvider>
      <Footer />
    </>
  );
}
