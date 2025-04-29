"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "../../../../public/ALL CSS/Login.css";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false); // Loader state

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loader

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setLoading(false); // Stop loader

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("email", data.email);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("role", data.role);

      // Role-based redirect
      if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else if (data.role === "partner") {
        router.push("/partner/dashboard");
      } else {
        router.push("/");
      }
    } else {
      const errorData = await res.json();
      alert(errorData.error || "Login failed");
    }
  };

  return (
    <>
      <Header />
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
