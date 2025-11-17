// components/GoogleMapsWrapper.js
"use client";

import React from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// keep libraries as a static const
const libraries = ["places"];

export default function GoogleMapsWrapper({ children }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    preventGoogleFontsLoading: true, // optional, speeds things up
  });

  if (loadError) {
    console.error("Google Maps failed to load:", loadError);
    return <div>Map failed to load</div>;
  }

  if (!isLoaded) {
    return <div>Loading map…</div>;
  }

  // Only render children when the API is loaded
  return <>{children}</>;
}
