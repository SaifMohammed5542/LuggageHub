'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: '#FEF3C7', icon: '⏳', desc: 'Your booking is confirmed and awaiting drop-off.' },
  confirmed: { label: 'Confirmed', color: '#F59E0B', bg: '#FEF3C7', icon: '✅', desc: 'Your booking is confirmed and awaiting drop-off.' },
  stored:    { label: 'Stored',    color: '#0284C7', bg: '#DBEAFE', icon: '🧳', desc: 'Your luggage is safely stored at the station.' },
  completed: { label: 'Completed', color: '#16A34A', bg: '#DCFCE7', icon: '🎉', desc: 'Booking completed. Your luggage has been picked up.' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2', icon: '❌', desc: 'This booking has been cancelled.' },
  no_show:   { label: 'No Show',   color: '#92400E', bg: '#FEF3C7', icon: '⚠️',  desc: 'Marked as no-show. Contact support if this is a mistake.' },
};

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const h = d.getUTCHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${h12}:${min} ${ampm}`;
}

// Format: BK-20260418-ABC1
// Auto-inserts hyphens after "BK" and after the 8-digit date block
function formatRef(raw) {
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 14);
  if (clean.length < 2) return clean;
  if (clean.length < 10) return clean.slice(0, 2) + '-' + clean.slice(2);
  return clean.slice(0, 2) + '-' + clean.slice(2, 10) + '-' + clean.slice(10);
}

function StatusPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [ref, setRef] = useState('');
  const [input, setInput] = useState('');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-lookup if ?ref= param present
  useEffect(() => {
    const paramRef = searchParams.get('ref');
    if (paramRef) {
      setInput(paramRef.toUpperCase());
      lookup(paramRef.toUpperCase());
    }
  }, []); // eslint-disable-line

  async function lookup(refVal) {
    const r = (refVal || input).trim().toUpperCase();
    if (!r) { setError('Enter your booking reference'); return; }
    setLoading(true); setError(''); setBooking(null); setRef(r);
    try {
      const res = await fetch(`/api/booking/status?ref=${encodeURIComponent(r)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Booking not found'); }
      else setBooking(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  const cfg = booking ? (STATUS_CONFIG[booking.status] || { label: booking.status, color: '#6B7280', bg: '#F3F4F6', icon: '📦', desc: '' }) : null;
  const totalBags = booking ? ((booking.smallBagCount || 0) + (booking.largeBagCount || 0) || booking.luggageCount || 0) : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: 520, margin: '0 auto', width: '100%', padding: '32px 16px 64px' }}>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Track Your Booking</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>Enter your booking reference to check the status of your luggage.</p>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            value={input}
            onChange={e => setInput(formatRef(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="e.g. BK-20260418-ABC1"
            style={{
              flex: 1, borderRadius: 10, border: '1.5px solid #d1d5db', padding: '12px 16px',
              fontSize: 16, fontFamily: 'monospace', letterSpacing: '0.05em', outline: 'none',
              background: '#fff',
            }}
            autoFocus
          />
          <button
            onClick={() => lookup()}
            disabled={loading}
            style={{
              borderRadius: 10, background: '#0284C7', color: '#fff', border: 'none',
              padding: '12px 22px', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '…' : 'Track'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#FEE2E2', color: '#DC2626', borderRadius: 10, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>
            ❌ {error}
          </div>
        )}

        {/* Result card */}
        {booking && cfg && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

            {/* Status banner */}
            <div style={{ background: cfg.bg, padding: '20px 20px 16px', borderBottom: `3px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>{cfg.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: cfg.color }}>{cfg.label}</div>
                  <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{cfg.desc}</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: '20px 20px 8px' }}>

              {/* Ref */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Booking Reference</span>
                <code style={{ fontSize: 15, fontWeight: 700, color: '#111827', background: '#f3f4f6', padding: '4px 10px', borderRadius: 6 }}>{booking.bookingReference}</code>
              </div>

              <div style={{ height: 1, background: '#f3f4f6', marginBottom: 16 }} />

              {/* Station */}
              {booking.station && (
                <Row icon="📍" label="Station" value={
                  <span>
                    <span style={{ fontWeight: 600 }}>{booking.station.name}</span>
                    {booking.station.location && <span style={{ color: '#6b7280', fontSize: 12, display: 'block' }}>{booking.station.location}{booking.station.suburb ? `, ${booking.station.suburb}` : ''}</span>}
                  </span>
                } />
              )}

              {/* Dates */}
              <Row icon="📦" label="Drop-off" value={formatDate(booking.dropOffDate)} />
              <Row icon="📤" label="Pick-up" value={formatDate(booking.pickUpDate)} />

              {/* Check-in time */}
              {booking.checkInTime && (
                <Row icon="✅" label="Checked In" value={formatDate(booking.checkInTime)} />
              )}

              <div style={{ height: 1, background: '#f3f4f6', margin: '8px 0 16px' }} />

              {/* Bags */}
              {(booking.smallBagCount > 0 || booking.largeBagCount > 0) ? (
                <>
                  {booking.smallBagCount > 0 && <Row icon="🎒" label="Small Bags" value={booking.smallBagCount} />}
                  {booking.largeBagCount > 0 && <Row icon="🧳" label="Large Bags" value={booking.largeBagCount} />}
                </>
              ) : (
                <Row icon="🧳" label="Bags" value={totalBags} />
              )}

              {/* Amount */}
              {booking.totalAmount != null && (
                <Row icon="💳" label="Amount Paid" value={<strong style={{ color: '#0284C7' }}>A${Number(booking.totalAmount).toFixed(2)}</strong>} />
              )}

              {/* Cancellation reason */}
              {booking.cancellationReason && (
                <div style={{ marginTop: 12, background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400E' }}>
                  <strong>Reason:</strong> {booking.cancellationReason}
                </div>
              )}
            </div>

            {/* Help footer */}
            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #f3f4f6', marginTop: 8 }}>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                Need help? Email{' '}
                <a href="mailto:support@luggageterminal.com" style={{ color: '#0284C7' }}>support@luggageterminal.com</a>
                {' '}or call{' '}
                <a href="tel:+610406177320" style={{ color: '#0284C7' }}>+61 0406 177320</a>
              </p>
            </div>
          </div>
        )}

        {/* New booking CTA */}
        {!booking && !loading && !error && (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>Don&apos;t have a booking yet?</p>
            <button
              onClick={() => router.push('/booking')}
              style={{ background: 'none', border: '1.5px solid #0284C7', color: '#0284C7', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
            >
              Book Now →
            </button>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
      <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{icon} {label}</span>
      <span style={{ fontSize: 13, color: '#111827', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function BookingStatusPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>}>
      <StatusPageInner />
    </Suspense>
  );
}
