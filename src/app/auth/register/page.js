"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import toast from "react-hot-toast";
import styles from "./register.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Account created successfully! 🎉");
        setTimeout(() => {
          router.push("/auth/login");
        }, 1200);
      } else {
        if (data.errors) {
          setFieldErrors(data.errors);
          toast.error("Please fix the errors and try again.");
        } else if (data.error) {
          toast.error(data.error);
        } else {
          toast.error("Registration failed, please try again.");
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className={styles.loginPage}>
        <div className={`${styles.loginContainer} ${styles.registerContainer}`}>
          <h1 className={styles.loginTitle}>Create Account</h1>

          <form onSubmit={handleSubmit} className={styles.loginForm} noValidate>
            <div className={styles.inputGroup}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                placeholder="Choose a username"
                onChange={handleChange}
                required
                className={styles.loginInput}
                aria-invalid={!!fieldErrors.username}
                aria-describedby={fieldErrors.username ? "username-error" : undefined}
              />
              {fieldErrors.username && (
                <p id="username-error" className={styles.errorMessage}>
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                onChange={handleChange}
                required
                className={styles.loginInput}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className={styles.errorMessage}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Create a password"
                onChange={handleChange}
                required
                className={styles.loginInput}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />
              <p className={styles.passwordHint}>Use at least 8 characters</p>
              {fieldErrors.password && (
                <p id="password-error" className={styles.errorMessage}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={styles.loginButton}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Signing Up..." : "Sign Up"}
            </button>
          </form>

          {loading && (
            <div className={styles.loader}>
              <div className={styles.spinner} />
            </div>
          )}

          <div className={styles.orDivider}>or</div>

          <p className={styles.registerLink}>
            Already have an account? <a href="/auth/login">Sign in</a>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
