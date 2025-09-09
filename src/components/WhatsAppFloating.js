"use client";
import React from "react";
import "../../public/ALL CSS/WhatsAppFloat.css"; // Ensure you have the CSS file for styling

export default function WhatsAppFloating() {
  const phoneNumber = "918978881569"; // change to your full WhatsApp number
  const defaultMessage = "Hi Luggage Terminal! I need help with my booking.";
  const waUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <>
      {/* Floating WhatsApp Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="lt-whatsapp-btn"
      >
        <img src="./whatsapp-icon-white.svg" alt="WhatsApp" />
      </a>

      {/* Desktop CTA beside button */}
      <div className="lt-whatsapp-cta">
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="lt-whatsapp-cta-link">
          Need help? Message us on WhatsApp
        </a>
      </div>
    </>
  );
}
