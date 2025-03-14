// app/Booked/page.js
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import '../../../public/ALL CSS/confirmation.css'

const Booked = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page after 5 seconds
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="confirmation-container">
      <h1>✅ Booking Confirmed!</h1>
      <p>Thank you for booking with us. A confirmation email has been sent to your inbox.</p>
      <p>You will be redirected to the home page in 5 seconds...</p>
    </div>
  );
};

export default Booked;