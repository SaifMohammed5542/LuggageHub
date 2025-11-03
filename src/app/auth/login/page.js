"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import toast, { Toaster } from "react-hot-toast";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Login successful! 🎉");
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        localStorage.setItem("email", data.email);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("role", data.role);

        setTimeout(() => {
          if (data.role === "admin") router.push("/admin/dashboard");
          else if (data.role === "partner") router.push("/partner/dashboard");
          else router.push("/");
        }, 1200);
      } else {
        if (data.errors) {
          if (data.errors.email) toast.error(data.errors.email);
          if (data.errors.password) toast.error(data.errors.password);
        } else if (data.error) toast.error(data.error);
        else toast.error("Login failed, please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Toaster position="top-right" reverseOrder={false} />
      <main className={styles.loginPage}>
        <div className={styles.loginContainer}>
          <h1 className={styles.loginTitle}>Welcome Back</h1>

          <form onSubmit={handleSubmit} className={styles.loginForm}>
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
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                onChange={handleChange}
                required
                className={styles.loginInput}
              />
            </div>

            <button
              type="submit"
              className={styles.loginButton}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {loading && (
            <div className={styles.loader}>
              <div className={styles.spinner} />
            </div>
          )}

          <div className={styles.orDivider}>or</div>

          <p className={styles.registerLink}>
            New here? <a href="/auth/register">Create an account</a>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
