"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "../../../../public/ALL CSS/Login.css";
import toast from "react-hot-toast"; // ✅ Import toast

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
        toast.success("Account created successfully! 🎉"); // ✅ success toast
        setTimeout(() => {
          router.push("/auth/login");
        }, 1500);
      } else {
        if (data.errors) {
          setFieldErrors(data.errors);
          toast.error("Please fix the errors and try again.");
        } else if (data.error) {
          toast.error(data.error); // ✅ show backend error
        } else {
          toast.error("Registration failed, please try again.");
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
      <div className="loginPage">
        <div className="loginContainer registerContainer">
          <h1 className="loginTitle">Create Account</h1>
          <form onSubmit={handleSubmit} className="loginForm">
            <div className="inputGroup">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                placeholder="Choose a username"
                onChange={handleChange}
                required
                className="loginInput"
              />
              {fieldErrors.username && (
                <p className="errorMessage">{fieldErrors.username}</p>
              )}
            </div>

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
              {fieldErrors.email && (
                <p className="errorMessage">{fieldErrors.email}</p>
              )}
            </div>

            <div className="inputGroup">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Create a password"
                onChange={handleChange}
                required
                className="loginInput"
              />
              <p className="passwordHint">Use at least 8 characters</p>
              {fieldErrors.password && (
                <p className="errorMessage">{fieldErrors.password}</p>
              )}
            </div>

            <button type="submit" className="loginButton" disabled={loading}>
              {loading ? "Signing Up..." : "Sign Up"}
            </button>
          </form>

          {loading && (
            <div className="loader">
              <div className="spinner"></div>
            </div>
          )}

          <div className="orDivider">or</div>

          <p className="registerLink">
            Already have an account? <a href="/auth/login">Sign in</a>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
