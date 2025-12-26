"use client"
import React from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "@/styles/policy.module.css";

function ContactUs() {
  return (
    <>
      <Header />
      
      <div className={styles.policyWrapper}>
        <div className={styles.policyPanel}>
          <h1>For any help, Contact Us at:</h1>

          <div className={styles.contactInfo}>
            <p>
    
            📩 <strong>
              Email:{" "}
              <a
                href="mailto:support@luggageterminal.com"
                className={styles["mailto"]}
              >
                support@luggageterminal.com
              </a>
            </strong>
          </p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default ContactUs;