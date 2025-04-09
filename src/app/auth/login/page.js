"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "../../../../public/ALL CSS/Login.css";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      const data = await res.json();

      // Store all necessary info in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("email", data.email);
      localStorage.setItem("userId", data.userId);  // ✅ Store user ID
      localStorage.setItem("role", data.role);      // ✅ Store role

      // Role-based redirection
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
            <button type="submit" className="loginButton">
              Sign In
            </button>
          </form>
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
