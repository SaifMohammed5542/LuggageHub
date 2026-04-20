// app/partner/application/earnings/page.js
'use client';
import { useEffect, useState } from 'react';

export default function EarningsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/partner/application/earnings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = n => `A$${Number(n).toFixed(2)}`;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #0284C7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#6b7280' }}>Loading earnings...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
      <button onClick={() => window.location.reload()} style={{ background: '#0284C7', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600 }}>
        Retry
      </button>
    </div>
  );

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ padding: '16px 0 12px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>💰 My Earnings</h1>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div style={card}>
          <div style={cardLabel}>This Month</div>
          <div style={{ ...cardValue, color: '#0284C7' }}>{fmt(data.earningsThisMonth)}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>All Time</div>
          <div style={cardValue}>{fmt(data.earningsAllTime)}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>Total Paid</div>
          <div style={{ ...cardValue, color: '#16a34a' }}>{fmt(data.totalPaid)}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>Outstanding</div>
          <div style={{ ...cardValue, color: data.outstanding > 0 ? '#d97706' : '#16a34a' }}>
            {fmt(data.outstanding)}
          </div>
        </div>
      </div>

      {/* Bonus progress */}
      {data.bonusProgress?.length > 0 && (
        <section style={section}>
          <div style={sectionTitle}>🎁 Bonus Progress</div>
          {data.bonusProgress.map(offer => {
            const pct = offer.earned ? 100 : Math.round((offer.current / offer.threshold) * 100);
            return (
              <div key={offer.offerId} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{offer.name}</span>
                  <span style={{ color: offer.earned ? '#16a34a' : '#6b7280' }}>
                    {offer.earned ? `✓ Earned A$${offer.rewardAmount}` : `${offer.current}/${offer.threshold}`}
                  </span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: offer.earned ? '#16a34a' : '#0284C7', transition: 'width 0.4s' }} />
                </div>
                {offer.windowEnd && !offer.earned && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                    Resets {new Date(offer.windowEnd).toLocaleDateString('en-AU')}
                  </div>
                )}
                {offer.earned && (
                  <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}>Bonus pending payout 🎉</div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Monthly breakdown */}
      <section style={section}>
        <div style={sectionTitle}>📅 Monthly Breakdown</div>
        {data.monthlyBreakdown?.map((m, i) => (
          <div key={m.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', gap: 10,
            borderBottom: i < data.monthlyBreakdown.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                background: m.paid ? '#dcfce7' : m.earnings > 0 ? '#fef3c7' : '#f3f4f6',
                color: m.paid ? '#16a34a' : m.earnings > 0 ? '#92400e' : '#9ca3af',
              }}>
                {m.paid ? '✓' : m.earnings > 0 ? '!' : '–'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.month}</div>
                {m.paid && m.paidAt && (
                  <div style={{ fontSize: 11, color: '#16a34a' }}>Paid {new Date(m.paidAt).toLocaleDateString('en-AU')}</div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: m.earnings > 0 ? '#111' : '#9ca3af' }}>
                {fmt(m.earnings)}
              </div>
              {m.paid ? (
                <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>✓ Paid</div>
              ) : m.earnings > 0 ? (
                <div style={{ fontSize: 11, color: '#d97706' }}>Pending</div>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

const card = { background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' };
const cardLabel = { fontSize: 11, color: '#6b7280', marginBottom: 4 };
const cardValue = { fontWeight: 700, fontSize: 20 };
const section = { background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const sectionTitle = { fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#111' };
