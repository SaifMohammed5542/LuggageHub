// components/GoogleMapsWrapper.tsx
"use client";

import React from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Keep libraries as a static const to prevent re-renders
const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export default function GoogleMapsWrapper({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    preventGoogleFontsLoading: true, // optional, speeds things up
  });

  // Error state - show error message
  if (loadError) {
    console.error("❌ Google Maps failed to load:", loadError);
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "20px",
        background: "var(--bg, #f5f5f5)",
        color: "var(--text, #333)",
      }}>
        <div style={{
          textAlign: "center",
          maxWidth: "500px",
          padding: "40px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", color: "#f44336" }}>
            ⚠️ Map Service Unavailable
          </h2>
          <p style={{ marginBottom: "20px", lineHeight: "1.6" }}>
            We&apos;re having trouble loading the map service. Please check your internet connection and try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              background: "var(--primary, #4285f4)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "500",
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Loading state - show minimal loader (this should be very brief)
  if (!isLoaded) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #f5f5f5)",
      }}>
        <div style={{
          textAlign: "center",
          padding: "40px",
        }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "4px solid rgba(66, 133, 244, 0.2)",
            borderTop: "4px solid #4285f4",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }} />
          <p style={{
            color: "var(--text-secondary, #666)",
            fontSize: "0.95rem",
          }}>
            Loading map services...
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Success - Google Maps is loaded, render children
  console.log("✅ Google Maps loaded successfully");
  return <>{children}</>;
}