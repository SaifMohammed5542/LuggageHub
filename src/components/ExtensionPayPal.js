// components/ExtensionPayPal.js - PayPal for extension payments
"use client";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState, useMemo } from "react";

const ExtensionPayPal = ({ 
  extensionAmount, 
  bookingReference, 
  onPaymentSuccess, 
  onPaymentError 
}) => {
  const [isButtonReady, setIsButtonReady] = useState(false);

  // ✅ Memoize options to prevent re-initialization
  const paypalOptions = useMemo(() => ({
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    currency: "AUD",
    locale: "en_AU",
    components: "buttons",
    "data-partner-attribution-id": "LuggageTerminal_SP",
  }), []);

  return (
    <div style={{ marginTop: "15px" }}>
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
            // ✅ Force buttons to stay mounted
            forceReRender={[extensionAmount]}
            // ✅ Called when SDK finishes rendering
            onInit={() => {
              console.log("✅ Extension PayPal button ready");
              setIsButtonReady(true);
            }}
            createOrder={(data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    description: `Extension for Booking ${bookingReference}`,
                    amount: {
                      value: extensionAmount.toFixed(2),
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
                console.log("✅ Extension payment captured:", details);

                // ✅ Extract PayPal identifiers
                const paymentData = {
                  paypalOrderId: details.id,
                  paypalTransactionId: details.purchase_units?.[0]?.payments?.captures?.[0]?.id,
                  payerEmail: details.payer?.email_address,
                  payerName: details.payer?.name?.given_name 
                    ? `${details.payer.name.given_name} ${details.payer.name.surname || ''}`
                    : null,
                  payerId: details.payer?.payer_id,
                  amount: extensionAmount,
                  currency: "AUD",
                  fullPayPalResponse: details,
                };

                console.log("📦 Extension payment data:", paymentData);
                onPaymentSuccess(paymentData);
              });
            }}
            onError={(err) => {
              console.error("Extension PayPal error:", err);
              
              const errorMessage = err?.message || "Payment failed. Please try again.";
              
              if (onPaymentError) {
                onPaymentError(errorMessage);
              } else {
                alert(errorMessage);
              }
            }}
            onCancel={() => {
              console.warn("User cancelled extension payment");
              if (onPaymentError) {
                onPaymentError("Payment was cancelled");
              }
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

export default ExtensionPayPal;