// components/LuggagePay.js - OPTIMIZED WITH PROPER PROVIDER
"use client";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState, useMemo } from "react";

const PayPalPayment = ({ totalAmount, onPaymentSuccess, formData, disabled = false }) => {
  const [isButtonReady, setIsButtonReady] = useState(false);

  // ✅ Memoize options to prevent re-initialization
  const paypalOptions = useMemo(() => ({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    currency: "AUD",
    locale: "en_AU",
    components: "buttons",
    "data-partner-attribution-id": "LuggageTerminal_SP",
  }), []);

  const logPaymentError = async (errorMessage) => {
    try {
      await fetch("/api/log-payment-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: formData?.email || "Unknown",
          station: formData?.stationId || "Unknown",
          error: errorMessage,
        }),
      });
    } catch (err) {
      console.error("Failed to log payment error:", err);
    }
  };

  return (
    <div style={{ marginTop: "15px" }}>
      {/* Helper note for tourists */}
      <div
        style={{
          fontSize: "0.95rem",
          color: "#333",
          marginBottom: "10px",
          background: "#ffffffff",
          padding: "10px 12px",
          borderLeft: "4px solid #0070ba",
          borderRadius: "6px",
          lineHeight: "1.4",
          fontFamily: "Arial, sans-serif",
        }}
      >
        ℹ️ <strong>If your card was issued outside Australia,</strong> please select your card&apos;s
        billing country from the dropdown before paying.💳
      </div>

      {/* ✅ Loading skeleton while PayPal initializes */}
      {!isButtonReady && (
        <div
          style={{
            height: "50px",
            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            borderRadius: "6px",
            marginBottom: "10px",
          }}
        />
      )}

      {/* ✅ Provider with memoized options prevents re-renders */}
      <PayPalScriptProvider options={paypalOptions}>
        <div style={{ 
          opacity: isButtonReady ? 1 : 0, 
          transition: "opacity 0.3s ease",
          minHeight: '50px'
        }}>
          <PayPalButtons
            fundingSource="card"
            disabled={disabled}
            // ✅ Force buttons to stay mounted
            forceReRender={[totalAmount, disabled]}
            // ✅ Called when SDK finishes rendering
            onInit={() => {
              console.log("✅ PayPal button ready for interaction");
              setIsButtonReady(true);
            }}
            createOrder={(data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: totalAmount.toFixed(2),
                      currency_code: "AUD",
                    },
                  },
                ],
                application_context: {
                  shipping_preference: "NO_SHIPPING",
                },
              });
            }}
            onClick={(_, actions) => {
              return actions.resolve().catch((err) => {
                console.error("PayPal card validation error:", err);
                logPaymentError("PayPal popup: card was rejected (not usable / could not be added)");
                alert("This card cannot be used. Please try another card.");
                return actions.reject();
              });
            }}
            onApprove={(data, actions) => {
              return actions.order.capture().then((details) => {
                console.log("✅ PayPal payment captured:", details);

                // ✅ Extract ALL PayPal identifiers
                const paypalOrderId = details.id;
                const paypalTransactionId = details.purchase_units?.[0]?.payments?.captures?.[0]?.id;
                const payerEmail = details.payer?.email_address;
                const payerName = details.payer?.name?.given_name 
                  ? `${details.payer.name.given_name} ${details.payer.name.surname || ''}`
                  : null;
                const payerId = details.payer?.payer_id;

                // ✅ Log what we captured
                console.log("📦 Captured PayPal data:", {
                  orderId: paypalOrderId,
                  transactionId: paypalTransactionId,
                  payerEmail,
                  payerName,
                  payerId,
                });

                // ✅ Pass complete payment data to parent
                onPaymentSuccess({
                  paypalOrderId,
                  paypalTransactionId,
                  payerEmail,
                  payerName,
                  payerId,
                  amount: totalAmount,
                  currency: "AUD",
                  fullPayPalResponse: details, // Store complete response for debugging
                });
              });
            }}
            onError={(err) => {
              console.error("PayPal error (raw):", err);
              
              const payload = {
                message: err?.message || "Unknown PayPal error",
                name: err?.name || null,
                details: err?.details || null,
                debug_id: err?.debug_id || err?.debugId || null,
                raw: err,
                formDataSnippet: { 
                  email: formData?.email, 
                  station: formData?.stationId 
                },
                ts: new Date().toISOString(),
              };

              // Send detailed log to your logging endpoint
              fetch("/api/log-payment-error", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }).catch((e) => console.error("failed to log payment error:", e));

              logPaymentError(payload.message);
              alert("Payment failed. Please try again or use a different card.");
            }}
            onCancel={() => {
              console.warn("User cancelled PayPal checkout");
              logPaymentError("User cancelled PayPal checkout");
              alert("Payment was cancelled.");
            }}
            style={{
              layout: "vertical",
              color: "black",
              shape: "rect",
              label: "checkout",
              tagline: false,
            }}
          />
        </div>
      </PayPalScriptProvider>

      {/* ✅ Shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PayPalPayment;