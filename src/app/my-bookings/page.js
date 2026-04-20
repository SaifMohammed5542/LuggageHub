// app/my-bookings/page.js - SIMPLE 1-BUTTON APPROACH
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./MyBookings.module.css";
import DateChangeModal from "@/components/DateChangeModal/DateChangeModal";

// ── Smart date-based status calculation ───────────────────
function getDisplayStatus(booking) {
  const { status, dropOffDate, pickUpDate } = booking;

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      emoji: "❌",
      color: "cancelled",
      description: "Booking was cancelled",
    };
  }
  if (status === "no_show") {
    return {
      label: "No Show",
      emoji: "⚠️",
      color: "noshow",
      description: "Customer did not arrive",
    };
  }

  const now = new Date();
  const dropOff = new Date(dropOffDate);
  const pickUp = new Date(pickUpDate);

  if (now > pickUp) {
    return {
      label: "Completed",
      emoji: "🏁",
      color: "completed",
      description: "Pick-up date has passed",
    };
  }

  if (now > dropOff && now <= pickUp) {
    return {
      label: "Stored",
      emoji: "📦",
      color: "stored",
      description: "Luggage should be stored — pick-up upcoming",
    };
  }

  return {
    label: "Active",
    emoji: "✅",
    color: "confirmed",
    description: "Drop-off date upcoming",
  };
}

// ── Helpers ───────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcDays(dropOff, pickUp) {
  if (!dropOff || !pickUp) return 0;
  const diff = new Date(pickUp) - new Date(dropOff);
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ── Ref formatter: BK-20260418-ABC1 ───────────────────────
function formatRef(raw) {
  const clean = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 14);
  if (clean.length < 2) return clean;
  if (clean.length < 10) return clean.slice(0, 2) + "-" + clean.slice(2);
  return clean.slice(0, 2) + "-" + clean.slice(2, 10) + "-" + clean.slice(10);
}

const STATUS_CFG = {
  pending:   { label: "Pending",   color: "#92400e", bg: "#FEF3C7", icon: "⏳" },
  confirmed: { label: "Confirmed", color: "#92400e", bg: "#FEF3C7", icon: "✅" },
  stored:    { label: "Stored",    color: "#1d4ed8", bg: "#DBEAFE", icon: "🧳" },
  completed: { label: "Completed", color: "#15803d", bg: "#DCFCE7", icon: "🎉" },
  cancelled: { label: "Cancelled", color: "#DC2626", bg: "#FEE2E2", icon: "❌" },
  no_show:   { label: "No Show",   color: "#92400e", bg: "#FEF3C7", icon: "⚠️"  },
};

// ── Guest Prompt ───────────────────────────────────────────
function GuestPrompt() {
  const [input, setInput] = useState("");
  const [booking, setBooking] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    const ref = input.trim();
    if (!ref) { setLookupError("Enter your booking reference"); return; }
    setLoading(true); setLookupError(""); setBooking(null);
    try {
      const res = await fetch(`/api/booking/status?ref=${encodeURIComponent(ref)}`);
      const data = await res.json();
      if (!res.ok) setLookupError(data.error || "Booking not found");
      else setBooking(data);
    } catch { setLookupError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const cfg = booking ? (STATUS_CFG[booking.status] || { label: booking.status, color: "#6b7280", bg: "#f3f4f6", icon: "📦" }) : null;

  return (
    <div className={styles.guestPage}>
      <Header />
      <main className={styles.guestMain}>
        <div className={styles.guestCard} style={{ maxWidth: 560, textAlign: "left" }}>

          {/* ── Track section ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>🔍</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Track a booking</h2>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)" }}>
              Enter your booking reference from your confirmation email — no login needed.
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => { setInput(formatRef(e.target.value)); setLookupError(""); setBooking(null); }}
                onKeyDown={e => e.key === "Enter" && lookup()}
                placeholder="BK-20260418-ABC1"
                style={{
                  flex: 1, borderRadius: 10, border: "1.5px solid var(--border-base)",
                  padding: "11px 14px", fontSize: 15, fontFamily: "monospace",
                  letterSpacing: "0.05em", outline: "none", background: "var(--surface-base)",
                }}
                autoFocus
              />
              <button
                onClick={lookup}
                disabled={loading}
                style={{
                  borderRadius: 10, background: loading ? "#d1d5db" : "#0284C7",
                  color: "#fff", border: "none", padding: "11px 20px",
                  fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? "…" : "Track"}
              </button>
            </div>

            {/* Error */}
            {lookupError && (
              <div style={{ marginTop: 10, background: "#FEE2E2", color: "#DC2626", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                ❌ {lookupError}
              </div>
            )}

            {/* Result card */}
            {booking && cfg && (
              <div style={{ marginTop: 14, border: `2px solid ${cfg.bg}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                {/* Status banner */}
                <div style={{ background: cfg.bg, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: cfg.color }}>{cfg.label}</div>
                    <code style={{ fontSize: 12, color: "#6b7280" }}>{booking.bookingReference}</code>
                  </div>
                </div>
                {/* Details */}
                <div style={{ padding: "12px 16px", fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                  {booking.station && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "#6b7280" }}>📍 Station</span>
                      <span style={{ fontWeight: 600, textAlign: "right" }}>{booking.station.name}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: "#6b7280" }}>📦 Drop-off</span>
                    <span style={{ fontWeight: 600 }}>{formatDate(booking.dropOffDate)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: "#6b7280" }}>📤 Pick-up</span>
                    <span style={{ fontWeight: 600 }}>{formatDate(booking.pickUpDate)}</span>
                  </div>
                  {(booking.smallBagCount > 0 || booking.largeBagCount > 0) && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "#6b7280" }}>🧳 Bags</span>
                      <span style={{ fontWeight: 600 }}>
                        {booking.smallBagCount > 0 && `${booking.smallBagCount} small`}
                        {booking.smallBagCount > 0 && booking.largeBagCount > 0 && " · "}
                        {booking.largeBagCount > 0 && `${booking.largeBagCount} large`}
                      </span>
                    </div>
                  )}
                  {booking.totalAmount != null && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, paddingTop: 6, borderTop: "1px solid #f3f4f6", marginTop: 2 }}>
                      <span style={{ color: "#6b7280" }}>💳 Paid</span>
                      <span style={{ fontWeight: 700, color: "#0284C7" }}>A${Number(booking.totalAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Divider ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
          </div>

          {/* ── Login section ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>🔑</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Sign in for full access</h2>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
              Log in with the same email you used when booking to see all your bookings, change dates, and more.
            </p>

            <div className={styles.guestButtons} style={{ marginBottom: 14 }}>
              <Link href="/auth/login" className={styles.guestLoginBtn}>
                Login to My Bookings
              </Link>
              <Link href="/auth/register" className={styles.guestRegisterBtn}>
                Create a Free Account
              </Link>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
              💡 Use the same email address you booked with — your history will appear automatically.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

const PRICING = { small: 3.99, large: 8.49 };
function calcAmount(b, dropOff, pickUp) {
  const days = Math.max(1, Math.ceil((new Date(pickUp) - new Date(dropOff)) / 86400000));
  const s = b.smallBagCount || 0, l = b.largeBagCount || 0;
  if (s > 0 || l > 0) return +(s * days * PRICING.small + l * days * PRICING.large).toFixed(2);
  return +((b.luggageCount || 0) * days * PRICING.small).toFixed(2);
}

// ── Booking Card ───────────────────────────────────────────
function BookingCard({ booking, onChangeDates, onRequestSubmitted }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [reduceModal, setReduceModal] = useState(false);
  const [reduceDropOff, setReduceDropOff] = useState('');
  const [reducePickUp, setReducePickUp] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reqError, setReqError] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');

  const status = getDisplayStatus(booking);
  const days = calcDays(booking.dropOffDate, booking.pickUpDate);
  const stationName = booking.stationId?.name || "Unknown Station";
  const stationLocation = booking.stationId?.location || booking.stationId?.address || "";

  const hoursUntilDropOff = (new Date(booking.dropOffDate) - new Date()) / 3600000;
  const canCancel = (status.label === "Active") && hoursUntilDropOff >= 2;

  // Extend allowed if Active (≥2h) or Stored (≥1h until pickup)
  const hoursUntilPickUp = (new Date(booking.pickUpDate) - new Date()) / 3600000;
  const canExtend = (status.label === "Active" && hoursUntilDropOff >= 2) ||
                    (status.label === "Stored" && hoursUntilPickUp >= 1);

  const toDateTimeLocal = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}T${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`;
  };

  // Reduce preview
  const reduceRefundAmt = (reduceDropOff && reducePickUp && new Date(reducePickUp) > new Date(reduceDropOff))
    ? Math.max(0, +(booking.totalAmount - calcAmount(booking, reduceDropOff, reducePickUp)).toFixed(2))
    : null;
  const reduceIsValid = reduceRefundAmt !== null && reduceRefundAmt > 0;

  const submitRequest = async (type) => {
    setSubmitting(true); setReqError('');
    const token = localStorage.getItem('token');
    try {
      const body = { bookingId: booking._id, type, customerNote };
      if (type === 'reduce') { body.requestedDropOff = reduceDropOff; body.requestedPickUp = reducePickUp; }
      const res = await fetch('/api/user/refund-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setReqSuccess(data.message);
      setCancelModal(false); setReduceModal(false);
      if (onRequestSubmitted) onRequestSubmitted();
    } catch (err) { setReqError(err.message); }
    finally { setSubmitting(false); }
  };

  const canChange = canExtend;

  return (
    <div className={`${styles.card} ${styles[`card_${status.color}`]}`}>
      {/* Card Header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={`${styles.statusBadge} ${styles[`status_${status.color}`]}`}>
            {status.emoji} {status.label}
          </span>
          <span className={styles.bookingRef}>#{booking.bookingReference}</span>
        </div>
        <div className={styles.cardHeaderRight}>
          <span className={styles.totalAmount}>
            A${Number(booking.totalAmount || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Station */}
      <div className={styles.stationRow}>
        <span className={styles.stationIcon}>📍</span>
        <div>
          <p className={styles.stationName}>{stationName}</p>
          {stationLocation && (
            <p className={styles.stationLocation}>{stationLocation}</p>
          )}
        </div>
      </div>

      {/* Dates Row */}
      <div className={styles.datesRow}>
        <div className={styles.dateBox}>
          <span className={styles.dateLabel}>Drop-off</span>
          <span className={styles.dateValue}>{formatDate(booking.dropOffDate)}</span>
          <span className={styles.timeValue}>{formatTime(booking.dropOffDate)}</span>
        </div>

        <div className={styles.durationBox}>
          <div className={styles.durationLine} />
          <span className={styles.durationLabel}>
            {days} {days === 1 ? "day" : "days"}
          </span>
          <div className={styles.durationLine} />
        </div>

        <div className={styles.dateBox}>
          <span className={styles.dateLabel}>Pick-up</span>
          <span className={styles.dateValue}>{formatDate(booking.pickUpDate)}</span>
          <span className={styles.timeValue}>{formatTime(booking.pickUpDate)}</span>
        </div>
      </div>

      {/* Bags Summary */}
      <div className={styles.bagsRow}>
        {booking.smallBagCount > 0 && (
          <span className={styles.bagChip}>
            🎒 {booking.smallBagCount} Small {booking.smallBagCount === 1 ? "Bag" : "Bags"}
          </span>
        )}
        {booking.largeBagCount > 0 && (
          <span className={styles.bagChip}>
            🧳 {booking.largeBagCount} Large {booking.largeBagCount === 1 ? "Bag" : "Bags"}
          </span>
        )}
      </div>

      {/* Request success banner */}
      {reqSuccess && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d', marginBottom: 8, fontWeight: 600 }}>
          ✅ {reqSuccess}
        </div>
      )}

      {/* Action buttons */}
      {canExtend && (
        <button className={styles.changeDatesBtn} onClick={() => onChangeDates(booking)}>
          📅 Extend Stay
        </button>
      )}
      {canCancel && !reqSuccess && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => { setReduceModal(true); setReduceDropOff(toDateTimeLocal(booking.dropOffDate)); setReducePickUp(toDateTimeLocal(booking.pickUpDate)); setReqError(''); }}
            style={{ flex: 1, padding: '9px 0', border: '1.5px solid #0284C7', background: '#fff', color: '#0284C7', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            ✂️ Shorten Stay
          </button>
          <button
            onClick={() => { setCancelModal(true); setReqError(''); }}
            style={{ flex: 1, padding: '9px 0', border: '1.5px solid #dc2626', background: '#fff', color: '#dc2626', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            ❌ Cancel Booking
          </button>
        </div>
      )}

      {/* Locked message */}
      {!canExtend && !canCancel && (status.label === "Active" || status.label === "Stored") && !reqSuccess && (
        <div className={styles.extensionBlocked}>
          <span className={styles.blockedIcon}>🔒</span>
          <span className={styles.blockedText}>Changes not available — drop-off is less than 2 hours away</span>
        </div>
      )}

      {/* ── Cancel confirmation modal ── */}
      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setCancelModal(false)}>
          <div style={{ background: '#fff', borderRadius: 14, maxWidth: 420, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>❌</div>
            <h3 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 17, textAlign: 'center' }}>Cancel Booking?</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
              A cancellation request will be sent to our team. Once reviewed, you&apos;ll receive a full refund of{' '}
              <strong style={{ color: '#0284C7' }}>A${Number(booking.totalAmount).toFixed(2)}</strong>.
            </p>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 14 }}>
              ⏱ Refunds are typically processed within 24 hours of your request.
            </div>
            <textarea
              value={customerNote}
              onChange={e => setCustomerNote(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              rows={2}
              style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'none', marginBottom: 14 }}
            />
            {reqError && <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>⚠️ {reqError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setCancelModal(false)} style={{ flex: 1, padding: '10px 0', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Keep Booking</button>
              <button onClick={() => submitRequest('cancel')} disabled={submitting} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: submitting ? '#d1d5db' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting…' : 'Request Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shorten Stay modal ── */}
      {reduceModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setReduceModal(false)}>
          <div style={{ background: '#fff', borderRadius: 14, maxWidth: 440, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>✂️</div>
            <h3 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 17, textAlign: 'center' }}>Shorten Your Stay</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>Select new (shorter) dates. The difference will be refunded once our team reviews.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4 }}>New Drop-off</label>
                <input type="datetime-local" value={reduceDropOff} onChange={e => setReduceDropOff(e.target.value)}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4 }}>New Pick-up</label>
                <input type="datetime-local" value={reducePickUp} onChange={e => setReducePickUp(e.target.value)}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>
            {reduceIsValid && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d', marginBottom: 14 }}>
                💰 Estimated refund: <strong>A${reduceRefundAmt.toFixed(2)}</strong> — processed after review.
              </div>
            )}
            {reduceRefundAmt !== null && reduceRefundAmt <= 0 && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
                New dates must result in a shorter stay than your current booking.
              </div>
            )}
            <textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} placeholder="Reason (optional)" rows={2}
              style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'none', marginBottom: 14 }} />
            {reqError && <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>⚠️ {reqError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setReduceModal(false)} style={{ flex: 1, padding: '10px 0', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => submitRequest('reduce')} disabled={submitting || !reduceIsValid}
                style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: (submitting || !reduceIsValid) ? '#d1d5db' : '#0284C7', color: '#fff', fontWeight: 700, fontSize: 14, cursor: (submitting || !reduceIsValid) ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting…' : 'Request Shorter Stay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expand Button */}
      <button
        className={styles.expandBtn}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide Details ▲" : "View Details ▼"}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className={styles.expandedSection}>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Full Name</span>
              <span className={styles.detailValue}>{booking.fullName}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Email</span>
              <span className={styles.detailValue}>{booking.email}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Phone</span>
              <span className={styles.detailValue}>{booking.phone || "N/A"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Total Bags</span>
              <span className={styles.detailValue}>{booking.luggageCount}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Amount Paid</span>
              <span className={styles.detailValue}>
                A${Number(booking.totalAmount || 0).toFixed(2)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Booked On</span>
              <span className={styles.detailValue}>
                {formatDate(booking.createdAt)}
              </span>
            </div>
            {booking.checkInTime && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Checked In</span>
                <span className={styles.detailValue}>
                  {formatDate(booking.checkInTime)} {formatTime(booking.checkInTime)}
                </span>
              </div>
            )}
            {booking.checkOutTime && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Checked Out</span>
                <span className={styles.detailValue}>
                  {formatDate(booking.checkOutTime)} {formatTime(booking.checkOutTime)}
                </span>
              </div>
            )}
          </div>

          {booking.specialInstructions && (
            <div className={styles.specialInstructions}>
              <span className={styles.detailLabel}>📝 Special Instructions</span>
              <p className={styles.instructionsText}>{booking.specialInstructions}</p>
            </div>
          )}

          {booking.status === "cancelled" && booking.cancellationReason && (
            <div className={styles.cancellationBox}>
              <span className={styles.detailLabel}>❌ Cancellation Reason</span>
              <p className={styles.instructionsText}>{booking.cancellationReason}</p>
            </div>
          )}

          <div className={styles.statusDescription}>
            <span>{status.emoji}</span>
            <span>{status.description}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filter Tabs ────────────────────────────────────────────
const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "stored", label: "Stored" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function filterBookings(bookings, filter) {
  if (filter === "all") return bookings;
  return bookings.filter((b) => {
    const displayStatus = getDisplayStatus(b);
    if (filter === "active") return displayStatus.label === "Active";
    if (filter === "stored") return displayStatus.label === "Stored";
    if (filter === "completed") return displayStatus.label === "Completed";
    if (filter === "cancelled") return displayStatus.label === "Cancelled";
    return true;
  });
}

// ── Main Page ──────────────────────────────────────────────
export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");
  const [username, setUsername] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  // Date change modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("username");

    if (!token || role === "admin" || role === "partner") {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);
    setUsername(name || "");
    fetchBookings(token);
  }, []);

  const fetchBookings = async (token) => {
    try {
      const res = await fetch("/api/user/my-bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.clear();
          router.push("/auth/login");
          return;
        }
        throw new Error(data.error || "Failed to fetch bookings");
      }

      setBookings(data.bookings || []);
      setIsEmailVerified(data.isEmailVerified ?? true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Date change handler
  const handleChangeDates = (booking) => {
    setSelectedBooking(booking);
    setShowModal(true);
  };

  const handleChangeSuccess = (result) => {
    setShowModal(false);
    setSelectedBooking(null);

    const dropOff = new Date(result.booking.newDropOffDate).toLocaleString("en-AU");
    const pickUp  = new Date(result.booking.newPickUpDate).toLocaleString("en-AU");
    const charge  = result.booking.charge > 0 ? ` · Charged: A$${result.booking.charge.toFixed(2)}` : " · No extra charge";

    setSuccessMessage(`Dates updated — Drop-off: ${dropOff} · Pick-up: ${pickUp}${charge}`);

    const token = localStorage.getItem("token");
    if (token) fetchBookings(token);
  };

  if (!isLoggedIn && !loading) {
    return <GuestPrompt />;
  }

  const filtered = filterBookings(bookings, activeFilter);

  const counts = {
    all: bookings.length,
    active: bookings.filter((b) => getDisplayStatus(b).label === "Active").length,
    stored: bookings.filter((b) => getDisplayStatus(b).label === "Stored").length,
    completed: bookings.filter((b) => getDisplayStatus(b).label === "Completed").length,
    cancelled: bookings.filter((b) => getDisplayStatus(b).label === "Cancelled").length,
  };

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>My Bookings</h1>
              <p className={styles.pageSubtitle}>
                {username ? `Welcome back, ${username}!` : "Your luggage storage history"}
              </p>
            </div>
            <Link href="/map-booking" className={styles.newBookingBtn}>
              + New Booking
            </Link>
          </div>

          {/* Success banner */}
          {successMessage && (
            <div className={styles.successBanner}>
              <span>✅</span>
              <div>
                <strong>Booking updated!</strong>
                <p>{successMessage}</p>
              </div>
            </div>
          )}

          {/* Unverified email warning */}
          {!isEmailVerified && (
            <div className={styles.verifyWarning}>
              <span>📧</span>
              <div>
                <strong>Verify your email to see all bookings</strong>
                <p>Guest bookings made before creating your account will appear once you verify your email address. Check your inbox for the verification link.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p>Loading your bookings...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <span>⚠️</span>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Try Again</button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className={styles.filterTabs}>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`${styles.filterTab} ${activeFilter === f.key ? styles.filterTabActive : ""}`}
                    onClick={() => setActiveFilter(f.key)}
                  >
                    {f.label}
                    {counts[f.key] > 0 && (
                      <span className={styles.filterCount}>{counts[f.key]}</span>
                    )}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🧳</span>
                  <h3 className={styles.emptyTitle}>
                    {activeFilter === "all"
                      ? "No bookings yet"
                      : `No ${activeFilter} bookings`}
                  </h3>
                  <p className={styles.emptyText}>
                    {activeFilter === "all"
                      ? "Your luggage storage bookings will appear here."
                      : "Try switching to a different filter."}
                  </p>
                  {activeFilter === "all" && (
                    <Link href="/map-booking" className={styles.emptyBtn}>
                      Book Storage Now
                    </Link>
                  )}
                </div>
              ) : (
                <div className={styles.bookingsList}>
                  {filtered.map((booking) => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onChangeDates={handleChangeDates}
                      onRequestSubmitted={() => { const tok = localStorage.getItem('token'); if (tok) fetchBookings(tok); }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      
      {/* ✅ Simple Date Change Modal */}
      {showModal && selectedBooking && (
        <DateChangeModal
          booking={selectedBooking}
          onClose={() => {
            setShowModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={handleChangeSuccess}
        />
      )}
    </>
  );
}