'use client';
import React, { useState } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "@/styles/policy.module.css";

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
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("error");
    }
  };

  return (
    <>
      <Header />
      
      <div className={styles.policyWrapper}>
        <div className={styles.policyPanel}>
          <h1>Contact Us</h1>
          <p>Have a question or need help? Reach out to us below.</p>

          <form className={styles.contactForm} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Name</label>
              <input 
                type="text" 
                id="name"
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required
                placeholder="Your Name" 
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input 
                type="email" 
                id="email"
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required
                placeholder="your.email@example.com" 
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="message">Message</label>
              <textarea 
                id="message"
                name="message" 
                value={formData.message} 
                onChange={handleChange} 
                required
                placeholder="How can we help you?" 
                rows="5"
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Sending..." : "Send Message"}
            </button>
          </form>

          {status === "success" && (
            <div className={`${styles.statusMessage} ${styles.success}`}>
               ✅ Message sent successfully! We&apos;ll get back to you soon.
            </div>
          )}

          {status === "error" && (
            <div className={`${styles.statusMessage} ${styles.error}`}>
              ❌ Failed to send message. Please try again or email us directly.
            </div>
          )}

          <div className={styles.contactInfo}>
            <p>
              <strong>Email:{" "}</strong>
              <a
                href="mailto:support@luggageterminal.com"
                className={styles["mailto"]}
              >
                support@luggageterminal.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default ContactUs;