'use client';
import React, { useState } from 'react';
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Sending...");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("✅ Message sent successfully!");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setStatus("❌ Failed to send. Try again.");
      }
    } catch (error) {
      setStatus("❌ Error sending message.");
    }
  };

  return (
    <>
      <Header />
      <div style={{ padding: '2rem', color: 'black' }}>
        <h1 style={{ color: '#235789' }}>Contact Us</h1>
        <p>Have a question or need help? Reach out to us below.</p>

        <form onSubmit={handleSubmit} style={{ maxWidth: '500px', marginTop: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Name:</label><br />
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required
              placeholder="Your Name" 
              style={{ width: '100%', padding: '0.5rem' }} 
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Email:</label><br />
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              required
              placeholder="Your Email" 
              style={{ width: '100%', padding: '0.5rem' }} 
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Message:</label><br />
            <textarea 
              name="message" 
              value={formData.message} 
              onChange={handleChange} 
              required
              placeholder="Your Message" 
              rows="5" 
              style={{ width: '100%', padding: '0.5rem' }} 
            />
          </div>
          <button type="submit" style={{ background: '#235789', color: 'white', padding: '0.7rem 1.5rem', border: 'none', cursor: 'pointer' }}>
            Send Message
          </button>
        </form>

        {status && <p style={{ marginTop: '1rem', color: 'green' }}>{status}</p>}
      </div>
      <Footer />
    </>
  );
};

export default ContactUs;
