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
    <PayPalScriptProvider
      options={{
        "client-id": "AdTTcQKcCdPjZwYhTP4onsB_xdphyWA4kUaDoiZqlu9eFe17yoRR_mze_0wTz-skAtsSwNxY_T2D5adR",
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
        onApprove={(data, actions) => {
          return actions.order.capture().then((details) => {
            onPaymentSuccess(details.id);
          });
        }}
        onError={(err) => {
          console.error("PayPal error:", err);
          logPaymentError(err?.message || err.toString());
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
  );
};

export default PayPalPayment;
