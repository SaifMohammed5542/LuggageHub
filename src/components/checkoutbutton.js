import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PayPalPayment = ({ totalAmount, onPaymentSuccess }) => {
  return (
    <PayPalScriptProvider
      options={{
        "client-id": "Aboo23AYFeclfVf1t3LP7pa-jMK55lgOiUK5ngc1CmEb0fWh7G55DxwckrCxxoqvBNVPsWuWvO5sZc9o", // Replace with your PayPal client ID
        currency: "AUD",
        locale: "en_AU" // Currency for the transaction
      }}
    >
      <PayPalButtons
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: totalAmount, // Total amount in AUD
                  currency_code: "AUD", // Currency for the transaction
                },
              },
            ],
            application_context: {
              shipping_preference: "NO_SHIPPING", // Disable shipping address
            },
          });
        }}
        onApprove={(data, actions) => {
          return actions.order.capture().then((details) => {
            // Call the onPaymentSuccess function with the payment ID
            onPaymentSuccess(details.id);
          });
        }}
        onError={(err) => {
          console.error("PayPal error:", err);
          alert("Payment failed. Please try again.");
        }}
        style={{
          layout: "vertical", // Button layout
          color: "blue", // Button color
          shape: "rect", // Button shape
          label: "checkout", // Button label (shows "Pay with Card")
          tagline: false, // Hide the tagline
        }}
      />
    </PayPalScriptProvider>
  );
};

export default PayPalPayment;