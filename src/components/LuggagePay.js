"use client";
import { useState, useEffect, useRef } from "react";

// PayPal iframe containers — inline because PayPal injects into these divs directly
const FIELD_WRAP = {
  height: "50px",
  background: "#F8FAFB",
  border: "1.5px solid #E2E8F0",
  borderRadius: "12px",
  marginBottom: "0",
  overflow: "hidden",
};

const LABEL = {
  display: "block",
  fontSize: "11px",
  fontWeight: "700",
  color: "#94A3B8",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: "5px",
};

const COUNTRIES = [
  ["AU","🇦🇺","Australia"],["NZ","🇳🇿","New Zealand"],["GB","🇬🇧","United Kingdom"],
  ["US","🇺🇸","United States"],["IN","🇮🇳","India"],["CN","🇨🇳","China"],
  ["JP","🇯🇵","Japan"],["KR","🇰🇷","South Korea"],["SG","🇸🇬","Singapore"],
  ["MY","🇲🇾","Malaysia"],["HK","🇭🇰","Hong Kong"],["ID","🇮🇩","Indonesia"],
  ["TH","🇹🇭","Thailand"],["PH","🇵🇭","Philippines"],["VN","🇻🇳","Vietnam"],
  ["TW","🇹🇼","Taiwan"],["CA","🇨🇦","Canada"],["AE","🇦🇪","UAE"],
  ["ZA","🇿🇦","South Africa"],["FR","🇫🇷","France"],["DE","🇩🇪","Germany"],
  ["IT","🇮🇹","Italy"],["ES","🇪🇸","Spain"],["NL","🇳🇱","Netherlands"],
  ["IE","🇮🇪","Ireland"],["BR","🇧🇷","Brazil"],["MX","🇲🇽","Mexico"],
  ["AR","🇦🇷","Argentina"],["AT","🇦🇹","Austria"],["BD","🇧🇩","Bangladesh"],
  ["BE","🇧🇪","Belgium"],["CH","🇨🇭","Switzerland"],["CL","🇨🇱","Chile"],
  ["DK","🇩🇰","Denmark"],["EG","🇪🇬","Egypt"],["FI","🇫🇮","Finland"],
  ["FJ","🇫🇯","Fiji"],["GH","🇬🇭","Ghana"],["GR","🇬🇷","Greece"],
  ["IL","🇮🇱","Israel"],["KE","🇰🇪","Kenya"],["LK","🇱🇰","Sri Lanka"],
  ["NG","🇳🇬","Nigeria"],["NO","🇳🇴","Norway"],["NP","🇳🇵","Nepal"],
  ["PG","🇵🇬","Papua New Guinea"],["PK","🇵🇰","Pakistan"],["PL","🇵🇱","Poland"],
  ["PT","🇵🇹","Portugal"],["RU","🇷🇺","Russia"],["SA","🇸🇦","Saudi Arabia"],
  ["SE","🇸🇪","Sweden"],["TR","🇹🇷","Turkey"],["UA","🇺🇦","Ukraine"],
];

const CSS = `
  .lt-field-row { display: flex; gap: 10px; margin-bottom: 12px; }
  .lt-field-row > div { flex: 1; }
  .lt-field-gap { margin-bottom: 12px; }

  .lt-select {
    width: 100%; height: 50px;
    padding: 0 4px 0 6px;
    background: #F8FAFB;
    border: 1.5px solid #E2E8F0;
    border-radius: 12px;
    font-size: 16px;
    color: #1A2B3C;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    -webkit-appearance: auto;
    appearance: auto;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .lt-select:focus {
    border-color: #0284C7;
    box-shadow: 0 0 0 3px rgba(2,132,199,0.12);
    background: #fff;
  }

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
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
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

const CardPayment = ({ totalAmount, onPaymentSuccess, formData, disabled = false, onProcessingChange }) => {
  const [sdkReady, setSdkReady]       = useState(false);
  const [fieldsReady, setFieldsReady] = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [initError, setInitError]     = useState(null);
  const [payError, setPayError]       = useState(null);
  const [countryCode, setCountryCode] = useState("AU");
  const cardFieldsRef                 = useRef(null);
  const amountRef                     = useRef(totalAmount);
  amountRef.current = totalAmount;

  const setProc = (val) => { setProcessing(val); onProcessingChange?.(val); };

  const logError = (msg) => fetch("/api/log-payment-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: formData?.email || "Unknown", station: formData?.stationId || "Unknown", error: msg }),
  }).catch(() => {});

  // ── 1. Load PayPal SDK ─────────────────────────────────────────────────────
  useEffect(() => {
    if (window.paypal?.CardFields) { setSdkReady(true); return; }
    let cancelled = false;

    fetch("/api/paypal/client-token")
      .then(r => r.json())
      .then(({ clientToken }) => {
        if (cancelled) return;
        if (!clientToken) { setInitError("Payment initialisation failed. Please refresh."); return; }
        document.getElementById("paypal-card-sdk")?.remove();
        const s = document.createElement("script");
        s.id  = "paypal-card-sdk";
        s.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&components=card-fields&currency=AUD&intent=capture&locale=en_AU`;
        s.setAttribute("data-client-token", clientToken);
        s.onload  = () => { if (!cancelled) setSdkReady(true); };
        s.onerror = () => { if (!cancelled) setInitError("Failed to load payment provider. Please refresh."); };
        document.head.appendChild(s);
      })
      .catch(() => { if (!cancelled) setInitError("Payment initialisation failed. Please refresh."); });

    return () => { cancelled = true; };
  }, []);

  // ── 2. Initialise CardFields ───────────────────────────────────────────────
  useEffect(() => {
    if (!sdkReady || !window.paypal?.CardFields || cardFieldsRef.current) return;
    let mounted = true;

    const cf = window.paypal.CardFields({
      createOrder: async () => {
        const res  = await fetch("/api/paypal/create-order", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountRef.current }),
        });
        const data = await res.json();
        if (!data.id) throw new Error(data.error || "Failed to create order");
        return data.id;
      },
      onApprove: async (data) => {
        if (!mounted) return;
        try {
          const res     = await fetch(`/api/paypal/capture-order/${data.orderID}`, { method: "POST" });
          const details = await res.json();
          if (!mounted) return;
          if (details.error) {
            setPayError(`Payment declined: ${details.error}. Please try another card.`);
            setProc(false);
            logError(`Capture: ${details.error}`);
            return;
          }
          try {
            await onPaymentSuccess({
              paypalOrderId:       details.id,
              paypalTransactionId: details.purchase_units?.[0]?.payments?.captures?.[0]?.id,
              payerEmail:          details.payer?.email_address,
              payerName:           details.payer?.name?.given_name
                ? `${details.payer.name.given_name} ${details.payer.name.surname || ""}`.trim()
                : null,
              payerId:             details.payer?.payer_id,
              amount:              amountRef.current,
              currency:            "AUD",
              fullPayPalResponse:  details,
            });
          } catch (bookingErr) {
            if (!mounted) return;
            // BookingDrawer already set its own payError — just unfreeze the button
            setProc(false);
            logError(`Booking post-payment: ${bookingErr.message}`);
          }
        } catch (err) {
          if (!mounted) return;
          setPayError("Payment capture failed. Please try again.");
          setProc(false);
          logError(`onApprove: ${err.message}`);
        }
      },
      onError: (err) => {
        if (!mounted) return;
        setPayError("Payment failed. Please check your card details and try again.");
        setProc(false);
        logError(err?.message || "CardFields error");
      },
      style: {
        input: {
          "font-size":   "16px",
          "font-family": "inherit",
          color:         "#1A2B3C",
          padding:       "0 14px",
        },
        ".invalid": { color: "#DC2626" },
        ":focus":   { color: "#1A2B3C" },
      },
    });

    if (!cf.isEligible()) {
      setInitError("Card payments are not available right now. Please try again later.");
      return;
    }

    Promise.all([
      cf.NameField().render("#paypal-card-name"),
      cf.NumberField().render("#paypal-card-number"),
      cf.ExpiryField().render("#paypal-card-expiry"),
      cf.CVVField().render("#paypal-card-cvv"),
    ]).then(() => {
      if (!mounted) return;
      cardFieldsRef.current = cf;
      setFieldsReady(true);
    }).catch((err) => {
      if (!mounted) return;
      setInitError("Could not render card fields. Please refresh.");
      console.error("CardFields render error:", err);
    });

    return () => { mounted = false; };
  }, [sdkReady]);

  const handlePay = async () => {
    if (!cardFieldsRef.current || processing || disabled) return;
    setPayError(null);
    setProc(true);
    try {
      await cardFieldsRef.current.submit({ billingAddress: { countryCode } });
    } catch {
      setPayError("Please check your card details and try again.");
      setProc(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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

          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ fontSize: "16px" }}>💳</span>
              <span style={{ fontSize: "13px", fontWeight: "800", color: "#1A2B3C", letterSpacing: "-0.2px" }}>
                Pay with Card
              </span>
            </div>
            {/* Card brand badges */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: "900", fontStyle: "italic", color: "#1A1F71", background: "#F0F4FF", border: "1px solid #C7D2FE", borderRadius: "5px", padding: "2px 6px" }}>VISA</span>
              <span style={{ fontSize: "9px",  fontWeight: "800", color: "#fff", background: "linear-gradient(90deg,#EB001B,#F79E1B)", borderRadius: "5px", padding: "3px 5px" }}>MC</span>
              <span style={{ fontSize: "9px",  fontWeight: "800", color: "#007BC1", background: "#EFF8FF", border: "1px solid #BAE6FD", borderRadius: "5px", padding: "2px 5px" }}>AMEX</span>
            </div>
          </div>

          {/* ── Fatal init error ── */}
          {initError && (
            <div style={{ padding: "13px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "12px", color: "#DC2626", fontSize: "13px", fontWeight: "600", lineHeight: "1.4" }}>
              ⚠️ {initError}
            </div>
          )}

          {/* ── Loading skeleton ── */}
          {!fieldsReady && !initError && (
            <div>
              <div style={{ fontSize: "12px", color: "#94A3B8", textAlign: "center", fontWeight: "600", marginBottom: "14px", letterSpacing: "0.2px" }}>
                Loading secure form…
              </div>
              {/* Name skeleton */}
              <div style={{ height: "50px", borderRadius: "12px", marginBottom: "12px", background: "linear-gradient(90deg,#F3F4F6 25%,#EAECEE 50%,#F3F4F6 75%)", backgroundSize: "200% 100%", animation: "lt-shimmer 1.5s infinite" }} />
              {/* Country + Number */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <div style={{ flex: "0 0 10%", height: "50px", borderRadius: "12px", background: "linear-gradient(90deg,#F3F4F6 25%,#EAECEE 50%,#F3F4F6 75%)", backgroundSize: "200% 100%", animation: "lt-shimmer 1.5s infinite 0.1s" }} />
                <div style={{ flex: 1,          height: "50px", borderRadius: "12px", background: "linear-gradient(90deg,#F3F4F6 25%,#EAECEE 50%,#F3F4F6 75%)", backgroundSize: "200% 100%", animation: "lt-shimmer 1.5s infinite 0.2s" }} />
              </div>
              {/* Expiry + CVV */}
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1, height: "50px", borderRadius: "12px", background: "linear-gradient(90deg,#F3F4F6 25%,#EAECEE 50%,#F3F4F6 75%)", backgroundSize: "200% 100%", animation: "lt-shimmer 1.5s infinite 0.15s" }} />
                <div style={{ flex: 1, height: "50px", borderRadius: "12px", background: "linear-gradient(90deg,#F3F4F6 25%,#EAECEE 50%,#F3F4F6 75%)", backgroundSize: "200% 100%", animation: "lt-shimmer 1.5s infinite 0.25s" }} />
              </div>
            </div>
          )}

          {/* ── Card field containers ──────────────────────────────────────────
              Must ALWAYS be in the DOM. PayPal injects iframes before fieldsReady.
              While loading: parked off-screen at fixed position.
          ─────────────────────────────────────────────────────────────────── */}
          <div style={fieldsReady
            ? { animation: "lt-fadein 0.25s ease" }
            : { position: "fixed", top: "-9999px", left: "-9999px", width: "320px" }
          }>

            {/* Row 1 — Cardholder Name */}
            <div className="lt-field-gap">
              <label style={LABEL}>Cardholder Name</label>
              <div id="paypal-card-name" style={FIELD_WRAP} />
            </div>

            {/* Row 2 — Country + Card Number */}
            <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "6px", lineHeight: "1.4" }}>
              If your card was issued outside Australia, select your country first.
            </div>
            <div className="lt-field-row" style={{ marginBottom: "12px" }}>
              <div style={{ flex: "0 0 10%" }}>
                <label style={LABEL}>Country</label>
                <select
                  className="lt-select"
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                >
                  {COUNTRIES.map(([code, flag]) => (
                    <option key={code} value={code}>{flag} {code}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Card Number</label>
                <div id="paypal-card-number" style={FIELD_WRAP} />
              </div>
            </div>

            {/* Row 3 — Expiry + CVV */}
            <div className="lt-field-row" style={{ marginBottom: "16px" }}>
              <div>
                <label style={LABEL}>Expiry Date</label>
                <div id="paypal-card-expiry" style={FIELD_WRAP} />
              </div>
              <div>
                <label style={LABEL}>CVV / CVC</label>
                <div id="paypal-card-cvv" style={FIELD_WRAP} />
              </div>
            </div>

            {/* Runtime pay error */}
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

            {/* Pay button */}
            <button
              type="button"
              className="lt-pay-btn"
              onClick={handlePay}
              disabled={processing || disabled}
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

          {/* ── Footer ── */}
          {!initError && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              marginTop: "14px", fontSize: "11px", color: "#CBD5E1", fontWeight: "600",
              letterSpacing: "0.3px",
            }}>
              <span>🔐</span>
              <span>256-bit encrypted · Secured by PayPal</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CardPayment;
