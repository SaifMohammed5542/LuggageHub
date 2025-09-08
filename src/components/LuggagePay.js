import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PayPalPayment = ({ totalAmount, onPaymentSuccess, formData }) => {
  // formData will have user email, stationId etc. (we’ll pass it from booking form)

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
        background: "#f8f9fa",
        padding: "10px 12px",
        borderLeft: "4px solid #0070ba", // PayPal blue accent
        borderRadius: "6px",
        lineHeight: "1.4",
        fontFamily: "Arial, sans-serif",
      }}
    >
      ℹ️ <strong>If your card was issued outside Australia,</strong> please select your card’s
      billing country from the dropdown before paying.💳
    </div>

    <PayPalScriptProvider
      options={{
        "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
        currency: "AUD",
        locale: "en_AU",
      }}
    >
      <PayPalButtons
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: totalAmount.toFixed(2), // Ensure it's string/decimal
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
            return actions.reject(); // stop checkout flow
          });
        }}
        onApprove={(data, actions) => {
          return actions.order.capture().then((details) => {
            onPaymentSuccess(details.id);
          });
        }}
        onError={(err) => {
          // improved logging for debugging & PayPal support
          console.error("PayPal error (raw):", err);
          const payload = {
            message: err?.message || "Unknown PayPal error",
            name: err?.name || null,
            details: err?.details || null,
            debug_id: err?.debug_id || err?.debugId || null,
            raw: err,
            formDataSnippet: { email: formData?.email, station: formData?.stationId },
            ts: new Date().toISOString(),
          };
          // send detailed log to your logging endpoint
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
          color: "blue",
          shape: "rect",
          label: "checkout",
          tagline: false,
        }}
      />
    </PayPalScriptProvider>
  </div>
);
};

export default PayPalPayment;
