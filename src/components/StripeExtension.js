"use client";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const STRIPE_APPEARANCE = {
  theme: "stripe",
  variables: {
    colorPrimary: "#0284C7",
    colorBackground: "#F8FAFB",
    colorText: "#1A2B3C",
    colorDanger: "#DC2626",
    fontFamily: "inherit",
    borderRadius: "12px",
  },
  rules: {
    ".Input": { border: "1.5px solid #E2E8F0", boxShadow: "none", fontSize: "16px", padding: "12px 14px" },
    ".Input:focus": { border: "1.5px solid #0284C7", boxShadow: "0 0 0 3px rgba(2,132,199,0.12)", backgroundColor: "#fff" },
    ".Label": { fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px" },
  },
};

function ExtensionForm({ extensionAmount, onPaymentSuccess, onPaymentError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [ready, setReady] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements || processing) return;
    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/booking` },
      redirect: "if_required",
    });

    if (error) {
      setProcessing(false);
      onPaymentError?.(error.message || "Payment failed. Please try again.");
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onPaymentSuccess({
        provider: "stripe",
        stripePaymentIntentId: paymentIntent.id,
        amount: extensionAmount,
        currency: "AUD",
      });
    } else {
      setProcessing(false);
      onPaymentError?.("Payment was not completed. Please try again.");
    }
  };

  return (
    <div style={{ marginTop: "12px" }}>
      <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs" }} />
      <button
        type="button"
        onClick={handlePay}
        disabled={!ready || processing}
        style={{
          marginTop: "14px", width: "100%", minHeight: "50px",
          background: processing ? "#CBD5E1" : "linear-gradient(135deg, #0284C7, #0369A1)",
          color: "#fff", border: "none", borderRadius: "14px",
          fontSize: "16px", fontWeight: "800", cursor: processing ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}
      >
        {processing ? "Processing…" : `🔒 Pay A$${Number(extensionAmount).toFixed(2)}`}
      </button>
    </div>
  );
}

export default function StripeExtension({ extensionAmount, onPaymentSuccess, onPaymentError }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    if (!extensionAmount) return;
    fetch("/api/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: extensionAmount }),
    })
      .then(r => r.json())
      .then(({ clientSecret, error }) => {
        if (error || !clientSecret) { setInitError("Payment initialisation failed. Please refresh."); return; }
        setClientSecret(clientSecret);
      })
      .catch(() => setInitError("Payment initialisation failed. Please refresh."));
  }, [extensionAmount]);

  if (initError) {
    return (
      <div style={{ padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "12px", color: "#DC2626", fontSize: "13px", fontWeight: "600" }}>
        ⚠️ {initError}
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={{ height: "50px", borderRadius: "12px", marginTop: "12px", background: "linear-gradient(90deg,#F3F4F6 25%,#EAECEE 50%,#F3F4F6 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }}>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
      <ExtensionForm
        extensionAmount={extensionAmount}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
      />
    </Elements>
  );
}
