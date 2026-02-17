// app/auth/login/page.js - WITH INLINE ERRORS
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Auto-refresh token every 10 minutes
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      await fetch('/api/auth/refresh', { 
        method: 'POST',
        credentials: 'include' 
      });
    }, 10 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      setErrors({ email: "Please enter your email first" });
      return;
    }

    setResendingEmail(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();

      if (res.ok) {
        setNeedsVerification(false);
        setErrors({ general: data.message || "Verification email sent! Check your inbox." });
      } else {
        setErrors({ general: data.error || "Failed to send email" });
      }
    } catch (err) {
      console.error("Resend error:", err);
      setErrors({ general: "Something went wrong" });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setNeedsVerification(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("email", data.email);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("role", data.role);

        setTimeout(() => {
          if (data.role === "admin") {
            router.push("/admin/dashboard");
          } else if (data.role === "partner") {
            router.push("/partner/dashboard");
          } else {
            router.push("/");
          }
        }, 300);
      } else {
        // Check if needs email verification
        if (data.needsVerification) {
          setNeedsVerification(true);
          setErrors({ 
            email: "Please verify your email first. Check your inbox for the verification link." 
          });
        } else if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.error || "Login failed" });
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className={styles.loginPage}>
        <div className={styles.loginContainer}>
          <h1 className={styles.loginTitle}>Welcome Back</h1>

          {errors.general && (
            <div className={styles.generalError}>
              <span className={styles.errorIcon}>ℹ️</span>
              {errors.general}
            </div>
          )}

          {needsVerification && (
            <div className={styles.verificationBox}>
              <div className={styles.verificationContent}>
                <p className={styles.verificationText}>
                  <strong>📧 Email Verification Required</strong>
                </p>
                <p className={styles.verificationSubtext}>
                  We sent a verification link to <strong>{formData.email}</strong>
                </p>
              </div>
              <button
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className={styles.resendButton}
              >
                {resendingEmail ? "Sending..." : "Resend Verification Email"}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.loginForm}>
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
                placeholder="Enter your password"
                onChange={handleChange}
                value={formData.password}
                required
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              />
              {errors.password && (
                <p className={styles.errorMessage}>
                  <span className={styles.errorIcon}>✕</span>
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={styles.loginButton}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <span className={styles.buttonContent}>
                  <span className={styles.spinner}></span>
                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          <p className={styles.registerLink}>
            New here?{" "}
            <a href="/auth/register" className={styles.link}>
              Create an account
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}