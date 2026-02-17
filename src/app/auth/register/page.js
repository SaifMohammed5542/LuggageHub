// app/auth/register/page.js - WITH INLINE ERRORS
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./register.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({}); // Clear all previous errors

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setShowSuccess(true);
      } else if (data.errors) {
        // Set inline errors
        setErrors(data.errors);
      } else {
        setErrors({ general: data.error || "Registration failed. Please try again." });
      }
    } catch (err) {
      console.error("Registration error:", err);
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <>
        <Header />
        <main className={styles.registerPage}>
          <div className={styles.registerContainer}>
            <div className={styles.successCard}>
              <div className={styles.successIcon}>📧</div>
              <h1 className={styles.successTitle}>Check Your Email!</h1>
              
              <p className={styles.successText}>
                We&apos;ve sent a verification link to
              </p>
              <p className={styles.successEmail}>{formData.email}</p>
              
              <p className={styles.successSubtext}>
                Please click the link in the email to verify your account and complete registration.
              </p>
              
              <div className={styles.infoBox}>
                <div className={styles.infoIcon}>⏰</div>
                <p className={styles.infoText}>
                  <strong>Note:</strong> The verification link expires in 24 hours.
                </p>
              </div>

              <div className={styles.helpBox}>
                <p className={styles.helpTitle}>
                  <strong>Didn&apos;t receive the email?</strong>
                </p>
                <ul className={styles.helpList}>
                  <li>Check your spam/junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>Wait a few minutes and check again</li>
                </ul>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  onClick={() => router.push("/auth/login")}
                  className={styles.primaryButton}
                >
                  Go to Login
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setFormData({ username: "", email: "", password: "" });
                    setErrors({});
                  }}
                  className={styles.secondaryButton}
                >
                  Register Another Account
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.registerPage}>
        <div className={styles.registerContainer}>
          <div className={styles.registerCard}>
            <h1 className={styles.registerTitle}>Create Your Account</h1>
            <p className={styles.registerSubtitle}>
              Join Luggage Terminal for secure storage solutions
            </p>

            {errors.general && (
              <div className={styles.generalError}>
                <span className={styles.errorIcon}>⚠️</span>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.registerForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="username" className={styles.label}>
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  onChange={handleChange}
                  value={formData.username}
                  required
                  className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                />
                {errors.username && (
                  <p className={styles.errorMessage}>
                    <span className={styles.errorIcon}>✕</span>
                    {errors.username}
                  </p>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  onChange={handleChange}
                  value={formData.email}
                  required
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                />
                {errors.email && (
                  <p className={styles.errorMessage}>
                    <span className={styles.errorIcon}>✕</span>
                    {errors.email}
                  </p>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Create a strong password"
                  onChange={handleChange}
                  value={formData.password}
                  required
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                />
                {errors.password ? (
                  <p className={styles.errorMessage}>
                    <span className={styles.errorIcon}>✕</span>
                    {errors.password}
                  </p>
                ) : (
                  <p className={styles.passwordHint}>
                    At least 8 characters with letters and numbers
                  </p>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <span className={styles.buttonContent}>
                    <span className={styles.spinner}></span>
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className={styles.divider}>
              <span className={styles.dividerText}>or</span>
            </div>

            <p className={styles.loginLink}>
              Already have an account?{" "}
              <a href="/auth/login" className={styles.link}>
                Sign in
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}