"use client";

import React from "react";
import Image from "next/image";
import styles from "./OurTopServices.module.css";

function OurTopServices({ servicesRef }) {
  const services = [
    {
      icon: "/images/suitcase.png",
      title: "Short-Term Storage",
      description: "Convenient storage for a few hours or a day.",
    },
    {
      icon: "/images/luggage.png",
      title: "Secure Lockers",
      description: "Keep your belongings safe with our secure lockers.",
    },
    {
      icon: "/images/travel-luggage (1).png",
      title: "Long-Term Storage",
      description: "Store your luggage for days or weeks hassle-free.",
    },
    {
      icon: "/images/booking.png",
      title: "Easy Online Booking",
      description: "Reserve your luggage storage space in seconds.",
    },
  ];

  return (
    <section
      ref={servicesRef}
      id="services"
      className={styles.servicesSection}
    >
      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <div className={styles.servicesContent}>
            <div className={styles.sectionHeader}>
              <span className={styles.badge}>What We Offer</span>
              <h2 className={styles.title}>Our Top Services</h2>
              <p className={styles.subtitle}>
                Flexible storage solutions designed for modern travelers
              </p>
            </div>

            <div className={styles.servicesGrid}>
              {services.map((service, index) => (
                <div key={index} className={styles.serviceCard}>
                  <div className={styles.iconWrapper}>
                    <div className={styles.iconBg}></div>
                    <Image
                      src={service.icon}
                      alt={service.title}
                      width={64}
                      height={64}
                      className={styles.serviceIcon}
                    />
                  </div>
                  <h3 className={styles.serviceTitle}>{service.title}</h3>
                  <p className={styles.serviceDescription}>
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.imageWrapper}>
            <div className={styles.imageDecoration}></div>
            <Image
              src="/images/air.jpg"
              alt="Luggage storage service"
              width={1200}
              height={800}
              className={styles.featureImage}
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default OurTopServices;