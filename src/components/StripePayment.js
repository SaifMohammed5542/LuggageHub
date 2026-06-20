"use client";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const CSS = `
  .lt-pay-btn {
    width: 100%;
    min-height: 54px;
    padding: 0 20px;
    background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
    color: #fff;
    border: none;
    border-radius: 16px;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 18px rgba(2,132,199,0.38);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
  }
  .lt-pay-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(2,132,199,0.48);
  }
  .lt-pay-btn:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(2,132,199,0.28);
  }
  .lt-pay-btn:disabled {
    background: #CBD5E1;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }
  @keyframes lt-spin    { to { transform: rotate(360deg); } }
  @keyframes lt-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes lt-fadein  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
`;

const STRIPE_APPEARANCE = {
  theme: "stripe",
  variables: {
    colorPrimary: "#0284C7",
    colorBackground: "#F8FAFB",
    colorText: "#1A2B3C",
    colorDanger: "#DC2626",
    fontFamily: "inherit",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1.5px solid #E2E8F0",
      boxShadow: "none",
      fontSize: "16px",
      padding: "12px 14px",
      height: "50px",
    },
    ".Input:focus": {
      border: "1.5px solid #0284C7",
      boxShadow: "0 0 0 3px rgba(2,132,199,0.12)",
      backgroundColor: "#fff",
    },
    ".Label": {
      fontSize: "11px",
      fontWeight: "700",
      color: "#94A3B8",
      textTransform: "uppercase",
      letterSpacing: "0.8px",
      marginBottom: "5px",
    },
  },
};

// ── Inner form — must be inside <Elements> ──────────────────────────────────
function CheckoutForm({ totalAmount, onPaymentSuccess, formData, disabled, onProcessingChange }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState(null);
  const [ready, setReady] = useState(false);

  const setProc = (val) => { setProcessing(val); onProcessingChange?.(val); };

  const logError = (msg) => fetch("/api/log-payment-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: formData?.email || "Unknown", station: formData?.stationId || "Unknown", error: msg }),
  }).catch(() => {});

  const handlePay = async () => {
    if (!stripe || !elements || processing || disabled) return;
    setPayError(null);
    setProc(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/Booked` },
        redirect: "if_required",
      });

      if (error) {
        setPayError(error.message || "Payment failed. Please check your card details and try again.");
        setProc(false);
        logError(error.message);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        try {
          await onPaymentSuccess({
            provider: "stripe",
            stripePaymentIntentId: paymentIntent.id,
            payerEmail: formData?.email,
            payerName: formData?.fullName,
            amount: totalAmount,
            currency: "AUD",
          });
        } catch (bookingErr) {
          setProc(false);
          logError(`Booking post-payment: ${bookingErr.message}`);
        }
      } else {
        setPayError("Payment was not completed. Please try again.");
        setProc(false);
      }
    } catch (err) {
      setPayError("Payment failed. Please try again.");
      setProc(false);
      logError(err?.message || "Stripe confirmPayment error");
    }
  };

  return (
    <div style={{ animation: "lt-fadein 0.25s ease" }}>
      <div style={{ marginBottom: "16px" }}>
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: "tabs" }}
        />
      </div>

      {payError && (
        <div style={{
          padding: "11px 14px", marginBottom: "12px",
          background: "#FEF2F2", border: "1px solid #FCA5A5",
          borderRadius: "12px", color: "#DC2626",
          fontSize: "13px", fontWeight: "600", lineHeight: "1.4",
        }}>
          ⚠️ {payError}
        </div>
      )}

      <button
        type="button"
        className="lt-pay-btn"
        onClick={handlePay}
        disabled={!ready || processing || disabled}
      >
        {processing ? (
          <>
            <span style={{
              width: "18px", height: "18px", borderRadius: "50%",
              border: "2.5px solid rgba(255,255,255,0.35)",
              borderTopColor: "#fff",
              animation: "lt-spin 0.7s linear infinite",
              flexShrink: 0,
            }} />
            Processing…
          </>
        ) : (
          <>
            <span style={{ fontSize: "18px", lineHeight: 1 }}>🔒</span>
            Pay A${Number(totalAmount).toFixed(2)}
          </>
        )}
      </button>
    </div>
  );
}

// ── Outer wrapper — creates PaymentIntent, initialises Elements ─────────────
export default function StripePayment({ totalAmount, onPaymentSuccess, formData, disabled = false, onProcessingChange }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    if (!totalAmount) return;
    fetch("/api/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalAmount }),
    })
      .then(r => r.json())
      .then(({ clientSecret, error }) => {
        if (error || !clientSecret) { setInitError("Payment initialisation failed. Please refresh."); return; }
        setClientSecret(clientSecret);
      })
      .catch(() => setInitError("Payment initialisation failed. Please refresh."));
  }, [totalAmount]);

  return (
    <div style={{ marginTop: "14px" }}>
      <style>{CSS}</style>

      <div style={{
        background: "#fff",
        border: "1.5px solid #E2E8F0",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 2px 16px rgba(26,43,60,0.08)",
      }}>
        {/* Top gradient accent */}
        <div style={{ height: "3px", background: "linear-gradient(90deg,#0284C7,#38BDF8 60%,#F59E0B)" }} />

        <div style={{ padding: "16px 16px 18px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ fontSize: "16px" }}>💳</span>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#1A2B3C", letterSpacing: "-0.2px" }}>
                Pay with Card
              </span>
            </div>
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: "900", fontStyle: "italic", color: "#1A1F71", background: "#F0F4FF", border: "1px solid #C7D2FE", borderRadius: "5px", padding: "2px 6px" }}>VISA</span>
              <span style={{ fontSize: "9px", fontWeight: "800", color: "#fff", background: "linear-gradient(90deg,#EB001B,#F79E1B)", borderRadius: "5px", padding: "3px 5px" }}>MC</span>
              <span style={{ fontSize: "9px", fontWeight: "800", color: "#007BC1", background: "#EFF8FF", border: "1px solid #BAE6FD", borderRadius: "5px", padding: "2px 5px" }}>AMEX</span>
            </div>
          </div>

          {/* Fatal init error */}
          {initError && (
            <div style={{ padding: "13px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "12px", color: "#DC2626", fontSize: "13px", fontWeight: "600", lineHeight: "1.4" }}>
              ⚠️ {initError}
            </div>
          )}

          {/* Loading skeleton */}
          {!clientSecret && !initError && (
            <div>
              <div style={{ fontSize: "12px", color: "#94A3B8", textAlign: "center", fontWeight: "600", marginBottom: "14px", letterSpacing: "0.2px" }}>
                Loading secure form…
              </div>
              {[0, 0.1, 0.2].map((delay, i) => (
                <div key={i} style={{ height: "50px", borderRadius: "12px", marginBottom: "12px", background: "linear-gradient(90deg,#F3F4F6 25%,#EAECEE 50%,#F3F4F6 75%)", backgroundSize: "200% 100%", animation: `lt-shimmer 1.5s infinite ${delay}s` }} />
              ))}
            </div>
          )}

          {/* Stripe Elements */}
          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
            >
              <CheckoutForm
                totalAmount={totalAmount}
                onPaymentSuccess={onPaymentSuccess}
                formData={formData}
                disabled={disabled}
                onProcessingChange={onProcessingChange}
              />
            </Elements>
          )}

          {/* Footer */}
          {!initError && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              marginTop: "14px", fontSize: "11px", color: "#CBD5E1", fontWeight: "600", letterSpacing: "0.3px",
            }}>
              <span>🔐</span>
              <span>256-bit encrypted · Secured by Stripe</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
