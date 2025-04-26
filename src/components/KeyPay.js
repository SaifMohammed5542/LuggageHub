"use client";
import { PayPalButtons } from "@paypal/react-paypal-js";

export default function PayPalCheckout({ amount, onSuccess }) {
  return (
    <div style={{ marginTop: "20px" }}>
      <PayPalButtons
        style={{ layout: "vertical" }}
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: { value: amount, currency_code: "AUD" }
            }]
          });
        }}
        onApprove={(data, actions) => {
          return actions.order.capture().then(details => {
            onSuccess(details);
          });
        }}
        onError={(err) => {
          console.error("PayPal Error:", err);
          alert("❌ PayPal payment error. Please try again.");
        }}
      />
    </div>
  );
}
