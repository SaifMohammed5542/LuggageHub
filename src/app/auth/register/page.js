"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import "../../../../public/ALL CSS/Login.css";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ 
    username: "", 
    email: "", 
    password: "" 
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      router.push("/auth/login");
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
          </div>
          
          <button type="submit" className="loginButton">
            Sign Up
          </button>
        </form>
        
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