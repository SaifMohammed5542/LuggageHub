'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { decodeToken } from '../../../utils/decodeToken';
import styles from './PartnerDashboard.module.css';

/**
 * Partner Dashboard (updated)
 * - Partners only see their share (PARTNER_SHARE)
 * - CSV exports include only partner-share values
 * - Left card shows "Estimated Payout — Current Month"
 * - Added "Back to months" button inside expanded month panels
 *
 * NOTE: fixed nested <button> issue by replacing the outer month-card buttons
 * with focusable <div role="button"> elements so inner <button>s are allowed.
 */

const PARTNER_SHARE = 0.4; // 40% partner share (change if needed)

export default function PartnerDashboard() {
  const [station, setStation] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [bookings, setBookings] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [detailBooking, setDetailBooking] = useState(null);
  const router = useRouter();

  const getWeekRange = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

const bookingGrossAmount = (booking) => {
  // ✅ CASE 1: New bookings with totalAmount field
  if (booking?.totalAmount != null && booking.totalAmount > 0) {
    return Number(booking.totalAmount);
  }
  
  // Calculate days for fallback calculations
  const dropOff = new Date(booking.dropOffDate);
  const pickUp = new Date(booking.pickUpDate);
  const days = Math.max(1, Math.ceil((pickUp - dropOff) / (1000 * 60 * 60 * 24)));
  
  // ✅ CASE 2: Bookings with ACTUAL bag breakdown (at least one bag type > 0)
  const hasSmallBags = (booking.smallBagCount || 0) > 0;
  const hasLargeBags = (booking.largeBagCount || 0) > 0;
  
  if (hasSmallBags || hasLargeBags) {
    const smallBagTotal = (booking.smallBagCount || 0) * days * 3.99;
    const largeBagTotal = (booking.largeBagCount || 0) * days * 8.49;
    return smallBagTotal + largeBagTotal;
  }
  
  // ✅ CASE 3: Old bookings with only luggageCount (all bags were 7.99)
  return (booking.luggageCount || 0) * days * 7.99;
};


  const bookingPartnerShare = (booking) => +(bookingGrossAmount(booking) * PARTNER_SHARE);

  const handoverPartnerShare = (handover) => {
    const gross = (handover.price !== undefined && handover.price !== null) ? Number(handover.price) : 0;
    return +(gross * PARTNER_SHARE);
  };

  const sumPartnerShares = (items, type = 'booking') => {
    return items.reduce((sum, it) => {
      const share = type === 'booking' ? bookingPartnerShare(it) : handoverPartnerShare(it);
      return sum + (isFinite(share) ? share : 0);
    }, 0);
  };

  const groupItemsByMonth = (items, dateKey = 'dropOffDate') => {
    const monthly = {};
    items.forEach(it => {
      const date = new Date(it[dateKey]);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthly[monthYear]) monthly[monthYear] = [];
      monthly[monthYear].push(it);
    });
    const sortedMonths = Object.entries(monthly).sort(([a], [b]) => new Date(b + ' 1') - new Date(a + ' 1'));
    return sortedMonths.map(([month, itemsInMonth]) => {
      const weekly = {};
      itemsInMonth.forEach(it => {
        const date = new Date(it[dateKey]);
        const weekRange = getWeekRange(date);
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day);
        if (!weekly[weekRange]) weekly[weekRange] = { items: [], weekStart };
        weekly[weekRange].items.push(it);
      });
      const sortedWeeks = Object.entries(weekly).sort(([, a], [, b]) => b.weekStart - a.weekStart);
      return [month, sortedWeeks];
    });
  };

  useEffect(() => {
    const fetchPartnerData = async () => {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const role = localStorage.getItem('role');

      if (!token || !userId || role !== 'partner') {
        router.push('/login');
        return;
      }

      const decoded = decodeToken(token);
      if (!decoded || decoded.role !== 'partner') {
        router.push('/login');
        return;
      }

      setIsAuthorized(true);
      setPartnerName(decoded.username);

      try {
        const stationRes = await fetch(`/api/partner/${userId}/station`, { headers: { Authorization: `Bearer ${token}` } });
        const stationData = await stationRes.json();
        if (stationRes.ok) setStation(stationData.station);

        const bookingsRes = await fetch(`/api/partner/${userId}/bookings`, { headers: { Authorization: `Bearer ${token}` } });
        const bookingsData = await bookingsRes.json();
        if (bookingsRes.ok) {
          const sorted = [...(bookingsData.bookings || [])].sort((a, b) => new Date(b.dropOffDate) - new Date(a.dropOffDate));
          setBookings(sorted);
        }

        const hoRes = await fetch(`/api/partner/${userId}/key-handovers`, { headers: { Authorization: `Bearer ${token}` } });
        const hoData = await hoRes.json();
        if (hoRes.ok) {
          const sortedHs = [...(hoData.handovers || [])].sort((a, b) => new Date(b.dropOffDate) - new Date(a.dropOffDate));
          setHandovers(sortedHs);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };
    fetchPartnerData();
  }, [router]);

  if (!isAuthorized) return <div className={styles.loading}>Checking access...</div>;

  /* CSV helpers */
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const toCSV = (rows, columns) => {
    const header = columns.map(c => esc(c.label)).join(',');
    const body = rows.map(r => columns.map(c => esc(c.key.split('.').reduce((o, k) => (o ? o[k] : ''), r))).join(',')).join('\n');
    return `${header}\n${body}`;
  };

  const downloadCSV = (text, filename) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportMonthCSV = (monthLabel, items, type = 'bookings') => {
    const stationNameSafe = (station?.name || 'station').replace(/\s+/g, '_');
    const filename = `${type}_${monthLabel.replace(/\s+/g, '_')}_${stationNameSafe}_partnerShare.csv`;

    if (type === 'bookings') {
      const rows = items.map(i => {
        const yourShare = bookingPartnerShare(i);
        return {
          fullName: i.fullName || '',
          email: i.email || '',
          phone: i.phone || '',
          luggageCount: i.luggageCount ?? '',
          dropOffDate: i.dropOffDate || '',
          pickUpDate: i.pickUpDate || '',
          paymentId: i.paymentId || '',
          status: i.status || '',
          specialInstructions: i.specialInstructions || '',
          yourShare: yourShare.toFixed(2)
        };
      });
      const cols = [
        { key: 'fullName', label: 'Full name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'luggageCount', label: 'Luggage count' },
        { key: 'dropOffDate', label: 'Drop-off date' },
        { key: 'pickUpDate', label: 'Pick-up date' },
        { key: 'paymentId', label: 'Payment ID' },
        { key: 'status', label: 'Status' },
        { key: 'specialInstructions', label: 'Instructions' },
        { key: 'yourShare', label: `Your Share (${Math.round(PARTNER_SHARE * 100)}%)` }
      ];
      const csv = toCSV(rows, cols);
      downloadCSV(csv, filename);
    } else {
      const rows = items.map(i => {
        const share = handoverPartnerShare(i);
        return {
          dropOffPerson: i.dropOffPerson?.name || '',
          pickUpPerson: i.pickUpPerson?.name || '',
          dropOffDate: i.dropOffDate || '',
          pickUpDate: i.pickUpDate || '',
          keyCode: i.keyCode || '',
          status: i.status || '',
          specialInstructions: i.specialInstructions || '',
          yourShare: share.toFixed(2)
        };
      });
      const cols = [
        { key: 'dropOffPerson', label: 'Drop-off person' },
        { key: 'pickUpPerson', label: 'Pick-up person' },
        { key: 'dropOffDate', label: 'Drop-off date' },
        { key: 'pickUpDate', label: 'Pick-up date' },
        { key: 'keyCode', label: 'Key code' },
        { key: 'status', label: 'Status' },
        { key: 'specialInstructions', label: 'Instructions' },
        { key: 'yourShare', label: `Your Share (${Math.round(PARTNER_SHARE * 100)}%)` }
      ];
      const csv = toCSV(rows, cols);
      downloadCSV(csv, filename);
    }
  };

  const exportWeekCSV = (month, weekRange, items, type = 'bookings') => {
    exportMonthCSV(`${month}_${weekRange}`, items, type);
  };

  /* expand handlers */
  const toggleMonth = (month) => {
    setExpandedMonth(prev => prev === month ? null : month);
    setExpandedWeeks(prev => prev[month] ? prev : { ...prev, [month]: new Set() });
  };

  const toggleWeek = (month, weekRange) => {
    setExpandedWeeks(prev => {
      const next = { ...prev };
      const setForMonth = new Set(next[month] ? Array.from(next[month]) : []);
      if (setForMonth.has(weekRange)) setForMonth.delete(weekRange);
      else setForMonth.add(weekRange);
      next[month] = setForMonth;
      return next;
    });
  };

  const getCurrentMonthKey = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const currentMonthKey = getCurrentMonthKey();
  const bookingsGrouped = groupItemsByMonth(bookings);
  const handoversGrouped = groupItemsByMonth(handovers);

  const currentMonthBookings = (bookingsGrouped.find(([m]) => m === currentMonthKey) || [null, []])[1]
    .flatMap(([, w]) => w.items || []);
  const currentMonthHandovers = (handoversGrouped.find(([m]) => m === currentMonthKey) || [null, []])[1]
    .flatMap(([, w]) => w.items || []);

  const currentBookingsPayout = sumPartnerShares(currentMonthBookings, 'booking');
  const currentHandoversPayout = sumPartnerShares(currentMonthHandovers, 'handover');
  const currentTotalPayout = currentBookingsPayout + currentHandoversPayout;

  const fmt = (n) => `A$${(Math.round(n * 100) / 100).toFixed(2)}`;

  const renderBookingsByMonth = () => {
    const months = groupItemsByMonth(bookings);
    if (months.length === 0) return <div className={styles.empty}>No bookings found for your station.</div>;

    return (
      <div className={styles.monthGrid}>
        {months.map(([month, weeks]) => {
          const monthItems = weeks.flatMap(([, wd]) => wd.items || []);
          const monthPartnerTotal = sumPartnerShares(monthItems, 'booking');
          const isOpen = expandedMonth === month;
          return (
            <div key={month} className={styles.monthCard}>
              <div className={styles.monthCardHeader}>
                {/* REPLACED outer <button> with focusable div to avoid nested button issue */}
                <div
                  className={styles.monthCardBtn}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggleMonth(month)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleMonth(month);
                    }
                  }}
                >
                  <div className={styles.monthCardContent}>
                    <div className={styles.monthCol}>
                      <div className={styles.monthCardTitle}>{month}</div>
                      <div className={styles.monthCardSub}>{monthItems.length} bookings • Your Share: {fmt(monthPartnerTotal)}</div>
                    </div>
                    <div className={styles.monthMetaGroup}>
                      <button
                        type="button"
                        className={styles.smallGhost}
                        onClick={(e) => { e.stopPropagation(); exportMonthCSV(month, monthItems, 'bookings'); }}
                        title="Export month CSV (partner share only)"
                      >
                        ⤓ Export
                      </button>
                      <div className={styles.monthCaret}>{isOpen ? '▾' : '▸'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className={styles.monthPanel}>
                  {/* Back to months button */}
                  <div className={styles.monthPanelHeader}>
                    <button type="button" className={styles.backToMonthsBtn} onClick={() => setExpandedMonth(null)}>← Back to months</button>
                  </div>

                  <div className={styles.weeksList}>
                    {weeks.map(([weekRange, weekData]) => {
                      const weekItems = weekData.items || [];
                      const weekPartnerTotal = sumPartnerShares(weekItems, 'booking');
                      const open = expandedWeeks[month] && expandedWeeks[month].has(weekRange);
                      return (
                        <div key={weekRange} className={styles.weekSectionAccordion}>
                          <div className={styles.weekHeaderRow}>
                            <button type="button" className={styles.weekAccordionHeader} onClick={() => toggleWeek(month, weekRange)} aria-expanded={open}>
                              <div>{weekRange}</div>
                              <div className={styles.weekMeta}>
                                <span className={styles.weekCount}>{weekItems.length} bookings</span>
                                <span className={styles.weekRevenue}>Your Share: {fmt(weekPartnerTotal)}</span>
                              </div>
                            </button>
                            <div className={styles.weekActions}>
                              <button type="button" className={styles.smallGhost} onClick={() => exportWeekCSV(month, weekRange, weekItems, 'bookings')}>⤓ Week CSV</button>
                            </div>
                          </div>

                          {open && (
                            <div className={styles.weekAccordionBody}>
                              {weekItems.map(b => {
                                const partnerShare = bookingPartnerShare(b);
                                return (
                                  <div key={b._id} className={styles.bookingRow}>
                                    <div className={styles.bookingHeaderRow}>
                                      <div className={styles.bookingName}>{b.fullName}</div>
                                      <div className={styles.amount}>Your Share: {fmt(partnerShare)}</div>
                                    </div>

                                    <div className={styles.bookingMeta}>
                                      <div><strong>Email:</strong> {b.email}</div>
                                      <div><strong>Phone:</strong> {b.phone}</div>
                                      <div><strong>Small:</strong> {b.smallBagCount ?? 0} |
<strong>Large:</strong> {b.largeBagCount ?? 0} |
<strong>Total:</strong> {b.luggageCount}
</div>
                                      <div><strong>Drop-off:</strong> {new Date(b.dropOffDate).toLocaleString()}</div>
                                      <div><strong>Pick-up:</strong> {new Date(b.pickUpDate).toLocaleString()}</div>
                                    </div>

                                    <div className={styles.bookingActions}>
                                      <button type="button" className={styles.smallButton} onClick={() => setDetailBooking(b)}>View</button>
                                      <button type="button" className={styles.smallGhost} onClick={() => exportMonthCSV(`${month}_${weekRange}`, [b], 'bookings')}>⤓ CSV</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderHandoversByMonth = () => {
    const months = groupItemsByMonth(handovers);
    if (months.length === 0) return <div className={styles.empty}>No key handovers found for your station.</div>;

    return (
      <div className={styles.monthGrid}>
        {months.map(([month, weeks]) => {
          const monthItems = weeks.flatMap(([, wd]) => wd.items || []);
          const monthPartner = sumPartnerShares(monthItems, 'handover');
          const key = `handover::${month}`;
          const isOpen = expandedMonth === key;
          return (
            <div key={month} className={styles.monthCard}>
              <div className={styles.monthCardHeader}>
                {/* REPLACED outer <button> with focusable div to avoid nested button issue */}
                <div
                  className={styles.monthCardBtn}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggleMonth(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleMonth(key);
                    }
                  }}
                >
                  <div className={styles.monthCardContent}>
                    <div className={styles.monthCol}>
                      <div className={styles.monthCardTitle}>{month}</div>
                      <div className={styles.monthCardSub}>{monthItems.length} handovers • Your Share: {fmt(monthPartner)}</div>
                    </div>
                    <div className={styles.monthMetaGroup}>
                      <button
                        type="button"
                        className={styles.smallGhost}
                        onClick={(e) => { e.stopPropagation(); exportMonthCSV(month, monthItems, 'handovers'); }}
                        title="Export month CSV (partner share only)"
                      >
                        ⤓ Export
                      </button>
                      <div className={styles.monthCaret}>{isOpen ? '▾' : '▸'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className={styles.monthPanel}>
                  {/* Back to months button for handovers too */}
                  <div className={styles.monthPanelHeader}>
                    <button type="button" className={styles.backToMonthsBtn} onClick={() => setExpandedMonth(null)}>← Back to months</button>
                  </div>

                  <div className={styles.weeksList}>
                    {weeks.map(([weekRange, weekData]) => {
                      const items = weekData.items || [];
                      const weekPartner = sumPartnerShares(items, 'handover');
                      const open = expandedWeeks[key] && expandedWeeks[key].has(weekRange);
                      return (
                        <div key={weekRange} className={styles.weekSectionAccordion}>
                          <div className={styles.weekHeaderRow}>
                            <button type="button" className={styles.weekAccordionHeader} onClick={() => toggleWeek(key, weekRange)} aria-expanded={open}>
                              <div>{weekRange}</div>
                              <div className={styles.weekMeta}>
                                <span className={styles.weekCount}>{items.length} handovers</span>
                                <span className={styles.weekRevenue}>Your Share: {fmt(weekPartner)}</span>
                              </div>
                            </button>
                            <div className={styles.weekActions}>
                              <button type="button" className={styles.smallGhost} onClick={() => exportWeekCSV(month, weekRange, items, 'handovers')}>⤓ Week CSV</button>
                            </div>
                          </div>

                          {open && (
                            <div className={styles.weekAccordionBody}>
                              {items.map(h => {
                                const share = handoverPartnerShare(h);
                                return (
                                  <div key={h._id} className={styles.handoverRow}>
                                    <div className={styles.handoverHeader}>
                                      <div><strong>Drop-off:</strong> {h.dropOffPerson?.name || '-'}</div>
                                      <div className={styles.statusBadge}>{h.status}</div>
                                    </div>
                                    <div className={styles.handoverMeta}>
                                      <div><strong>Pick-up:</strong> {h.pickUpPerson?.name || '-'}</div>
                                      <div><strong>Drop-off Date:</strong> {new Date(h.dropOffDate).toLocaleDateString()}</div>
                                      <div><strong>Pick-up Date:</strong> {new Date(h.pickUpDate).toLocaleDateString()}</div>
                                      <div><strong>Key Code:</strong> <code className={styles.code}>{h.keyCode}</code></div>
                                      <div><strong>Your Share:</strong> {fmt(share)}</div>
                                    </div>
                                    <div className={styles.bookingActions}>
                                      <button type="button" className={styles.smallGhost} onClick={() => exportMonthCSV(`${month}_${weekRange}_${h._id}`, [h], 'handovers')}>⤓ CSV</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Partner Dashboard</h1>
            <div className={styles.subtitle}>Welcome, <strong>{partnerName}</strong></div>
          </div>
          <div className={styles.userActions}>
            <button type="button" className={styles.logoutButton} onClick={() => { localStorage.clear(); router.push('/auth/login'); }}>Logout</button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.leftColumn}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Your Assigned Station</h2>
              </div>
              <div className={styles.cardBody}>
                {station ? (
                  <div className={styles.stationInfo}>
                    <div><strong>Name:</strong> {station.name}</div>
                    <div><strong>Location:</strong> {station.location}</div>
                    <div><strong>Capacity:</strong> {station.capacity ?? '—'}</div>
                    <div><strong>Payout:</strong> {station.bankDetails?.payoutEmail || '—'}</div>
                  </div>
                ) : (
                  <div className={styles.empty}>Loading station info...</div>
                )}
              </div>
            </section>

            <section className={styles.card} style={{ marginTop: 12 }}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Estimated Payout — {currentMonthKey}</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.stationInfo}>
                  <div><strong>Bookings Payout:</strong> {fmt(currentBookingsPayout)}</div>
                  <div><strong>Handovers Payout:</strong> {fmt(currentHandoversPayout)}</div>
                  <div style={{ marginTop: 8, fontWeight: 900 }}><strong>Total Estimated Payout:</strong> {fmt(currentTotalPayout)}</div>
                  <div style={{ marginTop: 8, color: 'var(--color-muted)', fontWeight:700, fontSize: 13 }}>
                    Partner share is <strong>{Math.round(PARTNER_SHARE * 100)}%</strong>. These are estimated values based on completed bookings/handovers.
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className={styles.rightColumn}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Bookings</h2>
                <div className={styles.cardMeta}>Total bookings: {bookings.length}</div>
              </div>
              <div className={styles.cardBody}>
                {renderBookingsByMonth()}
              </div>
            </section>

            <section className={styles.card} style={{ marginTop: 12 }}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Key Handovers</h2>
                <div className={styles.cardMeta}>Total handovers: {handovers.length}</div>
              </div>
              <div className={styles.cardBody}>
                {renderHandoversByMonth()}
              </div>
            </section>
          </div>
        </div>
      </div>

      {detailBooking && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Booking — {detailBooking.fullName}</h3>
              <button type="button" className={styles.modalClose} onClick={() => setDetailBooking(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p><strong>Email:</strong> {detailBooking.email}</p>
              <p><strong>Phone:</strong> {detailBooking.phone}</p>
              <p><strong>Luggage:</strong> {detailBooking.luggageCount}</p>
              <p><strong>Drop-off:</strong> {new Date(detailBooking.dropOffDate).toLocaleString()}</p>
              <p><strong>Pick-up:</strong> {new Date(detailBooking.pickUpDate).toLocaleString()}</p>
              <p><strong>Status:</strong> {detailBooking.status}</p>
              <p><strong>Your Share ({Math.round(PARTNER_SHARE * 100)}%):</strong> {fmt(bookingPartnerShare(detailBooking))}</p>
              {detailBooking.specialInstructions && <p><strong>Instructions:</strong> {detailBooking.specialInstructions}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.smallButton} onClick={() => { exportMonthCSV(`booking_${detailBooking._id}`, [detailBooking], 'bookings'); }}>Export Booking CSV</button>
              <button type="button" className={styles.smallGhost} onClick={() => setDetailBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
