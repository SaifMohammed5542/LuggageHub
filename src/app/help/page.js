"use client"
import React, { useState } from 'react';
import '../../../public/ALL CSS/ContactUs.css'; // Assuming you'll create a ContactUs.css file

function ContactUs() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Here you would typically send the form data to a server
        console.log(formData); // For demonstration
        // Reset form after submission:
        setFormData({ name: '', email: '', message: '' });
    };

    return (
        <div className="cu-container">
            <h1>Contact Us</h1>

            <div className="contact-info">
                {/* <p><strong>Address:</strong> 123 Main Street, Anytown, CA 12345</p>
                <p><strong>Phone:</strong> (123) 456-7890</p> */}
                <p><strong>Email:</strong> luggage5542@gmail.com</p>
            </div>

            {/* <div className="map-container">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3023.947262522776!2d-73.98513018459473!3d40.71431007933116!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a27e2f24131%3A0x64ff9f14299b8f2c!2sNew%20York%2C%20NY!5e0!3m2!1sen!2sus!4v1699999999999" // Replace with your desired location
                    width="600"
                    height="450"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Google Maps Location"
                ></iframe>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
                <label htmlFor="name">Name:</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />

                <label htmlFor="email">Email:</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <label htmlFor="message">Message:</label>
                <textarea
                    id="message"
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                    required
                ></textarea>

                <button type="submit">Send Message</button>
            </form> */}
        </div>
    );
}

export default ContactUs;