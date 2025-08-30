"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "../../../../public/ALL CSS/Login.css";
import toast, { Toaster } from "react-hot-toast"; // ✅ Import toast

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
        }, 1500);
      } else {
        // Field-specific errors
        if (data.errors) {
          if (data.errors.email) toast.error(data.errors.email);
          if (data.errors.password) toast.error(data.errors.password);
        } else if (data.error) {
          toast.error(data.error);
        } else {
          toast.error("Login failed, please try again.");
        }
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Toaster position="top-right" reverseOrder={false} /> {/* ✅ Add toaster */}
      <div className="loginPage">
        <div className="loginContainer">
          <h1 className="loginTitle">Welcome Back</h1>
          <form onSubmit={handleSubmit} className="loginForm">
            <div className="inputGroup">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                onChange={handleChange}
                required
                className="loginInput"
              />
            </div>
            <div className="inputGroup">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                onChange={handleChange}
                required
                className="loginInput"
              />
            </div>
            <button type="submit" className="loginButton" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {loading && (
            <div className="loader">
              <div className="spinner"></div>
            </div>
          )}

          <div className="orDivider">or</div>
          <p className="registerLink">
            New here? <a href="/auth/register">Create an account</a>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
