"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "../login/login.module.css";

function VerifyEmailContent() {
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ ADD THIS: Prevent double execution
  const hasVerified = useRef(false);

  useEffect(() => {
    // ✅ CHECK: Only run once
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setTimeout(() => {
          setStatus("error");
          setMessage("No verification token provided. Please check your email link.");
        }, 300);
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          if (data.alreadyVerified) {
            setStatus("already-verified");
            setMessage("Your email was already verified!");
          } else {
            setStatus("success");
            setMessage(data.message);
          }
          
          setTimeout(() => {
            router.push("/auth/login");
          }, 3000);
        } else {
          setStatus("error");
          if (data.expired) {
            setMessage("This verification link has expired. Please request a new one from the login page.");
          } else {
            setMessage(data.error || "Verification failed. Please try again.");
          }
        }
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verifyEmail();
  }, []); // ✅ EMPTY dependency array

  return (
    <>
      <Header />
      <main className={styles.loginPage}>
        <div className={styles.loginContainer}>
          <h1 className={styles.loginTitle}>Email Verification</h1>

          {status === "verifying" && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{
                width: "60px",
                height: "60px",
                border: "5px solid #f3f3f3",
                borderTop: "5px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 30px"
              }} />
              <style jsx>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <p style={{ fontSize: "18px", color: "#666", fontWeight: 500 }}>
                Verifying your email...
              </p>
              <p style={{ fontSize: "14px", color: "#999", marginTop: "10px" }}>
                Please wait a moment
              </p>
            </div>
          )}

          {status === "success" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "80px", marginBottom: "20px" }}>✅</div>
              <h2 style={{ color: "#059669", marginBottom: "15px", fontSize: "28px" }}>
                Email Verified!
              </h2>
              <p style={{ fontSize: "16px", color: "#666", marginBottom: "10px", lineHeight: "1.6" }}>
                {message}
              </p>
              <p style={{ fontSize: "14px", color: "#999", marginTop: "20px" }}>
                Redirecting to login in 3 seconds...
              </p>
            </div>
          )}

          {status === "already-verified" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "80px", marginBottom: "20px" }}>✓</div>
              <h2 style={{ color: "#0ea5e9", marginBottom: "15px", fontSize: "28px" }}>
                Already Verified
              </h2>
              <p style={{ fontSize: "16px", color: "#666", marginBottom: "10px", lineHeight: "1.6" }}>
                {message}
              </p>
              <p style={{ fontSize: "14px", color: "#999", marginTop: "20px" }}>
                Redirecting to login...
              </p>
            </div>
          )}

          {status === "error" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "80px", marginBottom: "20px" }}>❌</div>
              <h2 style={{ color: "#dc2626", marginBottom: "15px", fontSize: "28px" }}>
                Verification Failed
              </h2>
              <p style={{ fontSize: "16px", color: "#666", marginBottom: "30px", lineHeight: "1.6" }}>
                {message}
              </p>
              
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => router.push("/auth/login")}
                  className={styles.loginButton}
                  style={{ minWidth: "140px" }}
                >
                  Go to Login
                </button>
                <button
                  onClick={() => router.push("/auth/register")}
                  className={styles.loginButton}
                  style={{ background: "#64748b", minWidth: "140px" }}
                >
                  Register Again
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        minHeight: "100vh"
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #3498db",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}