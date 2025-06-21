import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PayPalPayment = ({ totalAmount, onPaymentSuccess }) => {
  return (
    <PayPalScriptProvider
      options={{
        "client-id": "AVXMvH-UbounOhTtyQemvCFGrkXalfCJmajXxbvSPT6h2Aiir9V6-ZNqZu7NsWmBnCl4Qy4_44xSw_rV", // Your PayPal client ID
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
              shipping_preference: "NO_SHIPPING", // Disable shippin  ` g address
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