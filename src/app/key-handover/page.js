"use client";
import { useState, useEffect } from "react";
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

  const [stations, setStations] = useState([]);      // ← station list
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Fetch stations on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/station/list");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // assuming { stations: [...] }
        setStations(data.stations || []);
      } catch (err) {
        console.error("Could not load stations:", err);
        setResult("❌ Unable to load stations. Try again later.");
      }
    }
    load();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (!formData.dropOffName || !formData.pickUpName || !formData.stationId) {
      setResult("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/key-handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropOffPerson: { name: formData.dropOffName, email: formData.dropOffEmail },
          pickUpPerson: { name: formData.pickUpName, email: formData.pickUpEmail },
          dropOffDate: formData.dropOffDate,
          pickUpDate: formData.pickUpDate,
          stationId: formData.stationId,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const txt = await res.text();
        console.error("Unexpected response:", txt);
        setResult("❌ Server response error.");
        return;
      }

      if (res.ok && data.success) {
        setResult(`✅ Success! Share this pickup code: ${data.handover.keyCode}`);
      } else {
        setResult(data.message || "❌ Something went wrong. Try again.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setResult("❌ Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="handover-form-container">
      <h1 className="handover-form-title">Key Handover Booking</h1>

      <form onSubmit={handleSubmit} className="handover-form">
        {/* Drop-off Person */}
        <div className="form-section">
          <h3 className="form-section-title">Drop-off Person</h3>
          <input
            className="form-input"
            type="text" name="dropOffName"
            placeholder="Full Name"
            value={formData.dropOffName}
            onChange={handleChange}
            required
          />
          <input
            className="form-input"
            type="email" name="dropOffEmail"
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
            type="text" name="pickUpName"
            placeholder="Full Name"
            value={formData.pickUpName}
            onChange={handleChange}
            required
          />
          <input
            className="form-input"
            type="email" name="pickUpEmail"
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
            type="date" name="dropOffDate"
            value={formData.dropOffDate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Pick-up Date:</label>
          <input
            className="form-input"
            type="date" name="pickUpDate"
            value={formData.pickUpDate}
            onChange={handleChange}
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
            {stations.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} — {s.location || ""}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Booking…" : "Book Key Handover"}
        </button>

        {result && <div className="result-message">{result}</div>}
      </form>
    </div>
  );
}
