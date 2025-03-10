"use client"
import React, { useState } from "react";
import "../../../public/ALL CSS/Input.css";
import Header from "../../components/Header.js";
import Payment from "../../components/Payment.js";
import App from "../../components/find.js"
import DumMap from "../../components/DumMap.js"
import GoogleMapDirections from "../../components/EmbMap.js";

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

  const ratePerLuggage = 500; // Define the rate per luggage (in AUD or INR)
  const totalAmount = formData.luggageCount * ratePerLuggage; // Calculate the total amount

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const response = await fetch("/api/booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
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
        <form onSubmit={handleSubmit}>
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
          {/* <div className="input-group">
            <label>📍 Storage Location</label>
            <select name="location" value={formData.location} onChange={handleChange} required>
              <option value="">Select a location</option>
              <option value="New York">New York</option>
              <option value="London">London</option>
              <option value="Paris">Paris</option>
            </select>
          </div> */}

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
  </div>

  <div className="input-group">
    <label>📅 Pick-up</label>
    <input 
      type="datetime-local" 
      name="pickUpDate" 
      value={formData.pickUpDate} 
      onChange={handleChange} 
      required 
      min={formData.dropOffDate 
        ? new Date(new Date(formData.dropOffDate).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16) // Ensures pickup is at least 1 hour after drop-off
        : new Date().toISOString().slice(0, 16)}
    />
  </div>
</div>



          <div className="double-input">
            <div className="input-group">
              <label>🎒 Luggage Count</label>
              <input type="number" name="luggageCount" min="1" max="10" value={formData.luggageCount} onChange={handleChange} required />
            </div>

            {/* <div className="input-group">
              <label>📏 Size</label>
              <select name="luggageSize" value={formData.luggageSize} onChange={handleChange}>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
            </div> */}
          </div>
          {/* <div className="input-group">
          <label>🎒 Luggage Count</label>
            <App />
          </div> */}

          <div className="input-group">
            <label>📝 Special Instructions</label>
            <textarea name="specialInstructions" value={formData.specialInstructions} onChange={handleChange}></textarea>
          </div>

          <div className="checkbox-container">
            <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} required />
            <span>I agree to the terms and conditions</span>
          </div>

          <button type="submit" className="submit-btn">✅ Confirm Booking</button>
        </form>
        <Payment totalAmount={totalAmount}/>
      </div>


      {/* <div className="Map">
        <GoogleMapDirections />
      </div> */}
    </div>
    </>
  );
};

export default LuggageBookingForm;
