import React from "react";
import styles from "./Testimonials.module.css";
import Trustpilot from "../Trustpilot";

const testimonialsData = [
  {
    name: "Emily R.",
    location: "Sydney, Australia",
    feedback:
      "Super convenient and reliable! I dropped my bags before heading to a meeting. Booking was seamless.",
    rating: 5,
  },
  {
    name: "David M.",
    location: "Melbourne, Australia",
    feedback:
      "Safe and secure storage. The staff was friendly and the process was quick. Highly recommended!",
    rating: 4,
  },
  {
    name: "Sophie L.",
    location: "Brisbane, Australia",
    feedback:
      "Affordable pricing and great locations. I’ll definitely use this again when I travel.",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className={styles["testimonials-section"]}>
      <h2 className={styles["testimonials-title"]}>What Our Customers Say</h2>

      <div className={styles["testimonials-grid"]}>
        {testimonialsData.map((testimonial, index) => (
          <div key={index} className={styles["testimonial-card"]}>
            <p className={styles["testimonial-feedback"]}>
              “{testimonial.feedback}”
            </p>

            <div className={styles["testimonial-rating"]} aria-hidden>
              {"★".repeat(testimonial.rating) +
                "☆".repeat(5 - testimonial.rating)}
            </div>

            <div className={styles["testimonial-author"]}>
              <strong>{testimonial.name}</strong>, {testimonial.location}
            </div>
          </div>

        ))}
      </div>
      <Trustpilot />
    </section>
  );
};

export default Testimonials;
