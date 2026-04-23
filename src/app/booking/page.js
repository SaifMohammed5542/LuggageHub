"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import styles from "./booking.module.css";
import PayPalPayment from "@/components/LuggagePay";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const StationMapMapbox = dynamic(
  () => import("@/components/BookingDrawer/StationMapMapbox"),
  { ssr: false }
);

// ─── Helpers (mirrored from BookingDrawer) ────────────────────────────────────

function getRoundedNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  const d = new Date(`${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:00Z`);
  const mins = d.getUTCMinutes(), rem = mins % 15;
  if (rem !== 0) d.setUTCMinutes(mins + (15 - rem), 0, 0);
  else d.setUTCSeconds(0, 0);
  return d;
}
function addHours(date, h) {
  return new Date(new Date(date).getTime() + h * 3600000);
}
const _WDAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toLocalISO(date) {
  const d = new Date(date);
  return [d.getUTCFullYear(), String(d.getUTCMonth()+1).padStart(2,'0'), String(d.getUTCDate()).padStart(2,'0')].join('-')
    + 'T' + [String(d.getUTCHours()).padStart(2,'0'), String(d.getUTCMinutes()).padStart(2,'0')].join(':') + ':00.000Z';
}
function formatTime(d) {
  const dt = new Date(d);
  const h = dt.getUTCHours() % 12 || 12;
  return `${h}:${String(dt.getUTCMinutes()).padStart(2,'0')} ${dt.getUTCHours() >= 12 ? 'pm' : 'am'}`;
}
function formatDate(d) {
  const date = new Date(d);
  const now = getRoundedNow();
  const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
  const tom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1));
  const tomKey = `${tom.getUTCFullYear()}-${tom.getUTCMonth()}-${tom.getUTCDate()}`;
  const dKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  if (dKey === todayKey) return "Today";
  if (dKey === tomKey)   return "Tomorrow";
  return `${_WDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${_MONTHS[date.getUTCMonth()]}`;
}
function formatDateFull(d) {
  const date = new Date(d);
  return `${_WDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dl = (lat2 - lat1) * Math.PI / 180;
  const dn = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dl / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dn / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getCoords(s) {
  const c = s.coordinates?.coordinates || s.coordinates;
  if (!c || !Array.isArray(c) || c.length < 2) return null;
  return { lat: Number(c[1]), lon: Number(c[0]) };
}
function getOpenStatus(timings) {
  if (!timings) return "unknown";
  if (timings.is24Hours) return "open";
  const now = new Date();
  const day = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][now.getDay()];
  const t = timings[day];
  if (!t || t.closed || !t.open || !t.close) return "unknown";
  const nowM = now.getHours() * 60 + now.getMinutes();
  const oM = Number(t.open.split(":")[0]) * 60 + Number(t.open.split(":")[1]);
  const cM = Number(t.close.split(":")[0]) * 60 + Number(t.close.split(":")[1]);
  if (cM < oM) return (nowM >= oM || nowM <= cM) ? "open" : "closed";
  return (nowM >= oM && nowM < cM) ? "open" : "closed";
}
function isWithinOpenHours(date, timings) {
  if (!timings || timings.is24Hours) return true;
  const d = new Date(date);
  const day = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][d.getDay()];
  const t = timings[day];
  if (!t) return true;
  if (t.closed) return false;
  if (!t.open || !t.close) return true;
  const m = d.getHours() * 60 + d.getMinutes();
  const oM = Number(t.open.split(":")[0]) * 60 + Number(t.open.split(":")[1]);
  const cM = Number(t.close.split(":")[0]) * 60 + Number(t.close.split(":")[1]);
  if (cM < oM) return m >= oM || m < cM;
  return m >= oM && m < cM;
}
function isPresetViable(dropOff, hours, timings) {
  if (!timings || timings.is24Hours) return true;
  return isWithinOpenHours(addHours(dropOff, hours), timings);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRICING = { small: 3.99, large: 8.49 };
const PRESETS = [
  { label: "2 hrs",    hours: 2   },
  { label: "Half day", hours: 6   },
  { label: "Full day", hours: 24  },
  { label: "2 days",   hours: 48  },
  { label: "Week",     hours: 168 },
];
const MAX_DAYS = 60;

function getDays() {
  const days = [], now = getRoundedNow();
  for (let i = 0; i < 60; i++) {
    days.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i)));
  }
  return days;
}
function getTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15)
      slots.push({
        h, m,
        label: `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'pm' : 'am'}`,
      });
  return slots;
}

async function geocodeQuery(q) {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.results?.length) return null;
    return { lat: data.results[0].lat, lon: data.results[0].lon };
  } catch { return null; }
}

// ─── AvailBar ─────────────────────────────────────────────────────────────────
function AvailBar({ current, max }) {
  if (!max) return null;
  const free = max - current;
  const pct = Math.min(100, (current / max) * 100);
  const color = free === 0 ? "#ef4444" : free <= 3 ? "#f59e0b" : "#22c55e";
  return (
    <div className={styles.availWrap}>
      <div className={styles.availBar}>
        <div className={styles.availFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.availText} style={{ color }}>
        {free === 0 ? "Full" : free <= 3 ? `Only ${free} left!` : `${free} spots free`}
      </span>
    </div>
  );
}

// ─── ScrollDrum ───────────────────────────────────────────────────────────────
function ScrollDrum({ items, selectedIndex, onSelect, getLabel }) {
  const ref = useRef(null);
  const ITEM_H = 44, PAD = 3;
  const snapTimer = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = selectedIndex * ITEM_H;
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!ref.current) return;
    const cur = Math.round(ref.current.scrollTop / ITEM_H);
    if (cur !== selectedIndex)
      ref.current.scrollTo({ top: selectedIndex * ITEM_H, behavior: "smooth" });
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(ref.current.scrollTop / ITEM_H)));
      ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      if (idx !== selectedIndex) onSelect(idx);
    }, 80);
  }, [items.length, selectedIndex, onSelect]);

  return (
    <div className={styles.drumWrap}>
      <div className={styles.drumFadeTop} />
      <div className={styles.drumFadeBottom} />
      <div
        ref={ref}
        className={styles.drumScroll}
        onScroll={handleScroll}
        style={{ paddingTop: ITEM_H * PAD, paddingBottom: ITEM_H * PAD }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={`${styles.drumItem} ${i === selectedIndex ? styles.drumItemActive : ""}`}
            style={{ height: ITEM_H }}
            onClick={() => {
              onSelect(i);
              ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
            }}
          >
            {getLabel(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DateTimePicker modal ─────────────────────────────────────────────────────
function DateTimePicker({ title, initialDate, minDate, onConfirm, onClose, timings, dropOff }) {
  const DAYS = getDays(), TIME_SLOTS = getTimeSlots();
  const d = new Date(initialDate);
  const initDay = Math.max(0, DAYS.findIndex(x =>
    x.getUTCFullYear() === d.getUTCFullYear() && x.getUTCMonth() === d.getUTCMonth() && x.getUTCDate() === d.getUTCDate()
  ));
  const nm = Math.round(d.getUTCMinutes() / 15) * 15;
  const sh = nm === 60 ? d.getUTCHours() + 1 : d.getUTCHours();
  const sm = nm === 60 ? 0 : nm;
  const initSlot = Math.max(0, TIME_SLOTS.findIndex(s => s.h === sh && s.m === sm));
  const [dayIdx, setDayIdx] = useState(initDay);
  const [slotIdx, setSlotIdx] = useState(initSlot);
  const today    = getRoundedNow();
  const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));

  const getResult = () => {
    const day = DAYS[dayIdx];
    const s = TIME_SLOTS[slotIdx];
    return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), s.h, s.m, 0, 0));
  };
  const isValid = () => getResult() >= (minDate || getRoundedNow());

  return (
    <div className={styles.pickerOverlay} onClick={onClose}>
      <div className={styles.pickerSheet} onClick={e => e.stopPropagation()}>
        <div className={styles.pickerHeader}>
          <button type="button" onClick={onClose} className={styles.pickerCancel}>Cancel</button>
          <span className={styles.pickerTitle}>{title}</span>
          <button
            type="button"
            onClick={() => isValid() && onConfirm(getResult())}
            disabled={!isValid()}
            className={`${styles.pickerSet} ${isValid() ? styles.pickerSetActive : ""}`}
          >Set</button>
        </div>
        <div className={styles.pickerPreview}>
          <span className={styles.pickerPreviewText}>
            {formatDateFull(DAYS[dayIdx])} · {TIME_SLOTS[slotIdx]?.label}
          </span>
          {!isValid() && <span className={styles.pickerPreviewErr}>Must be after minimum time</span>}
        </div>
        <div className={styles.pickerColLabels}>
          <div style={{ flex: 1.4, textAlign: "center" }} className={styles.pickerColLabel}>Date</div>
          <div style={{ flex: 1, textAlign: "center" }} className={styles.pickerColLabel}>Time</div>
        </div>
        <div className={styles.pickerDrums}>
          <div style={{ flex: 1.4 }}>
            <ScrollDrum
              items={DAYS}
              selectedIndex={dayIdx}
              onSelect={setDayIdx}
              getLabel={d2 => {
                const same = (a,b) => a.getUTCFullYear()===b.getUTCFullYear() && a.getUTCMonth()===b.getUTCMonth() && a.getUTCDate()===b.getUTCDate();
                if (same(d2, today))    return "Today";
                if (same(d2, tomorrow)) return "Tomorrow";
                return `${_WDAYS[d2.getUTCDay()]}, ${d2.getUTCDate()} ${_MONTHS[d2.getUTCMonth()]}`;
              }}
            />
          </div>
          <div className={styles.pickerDrumDivider} />
          <div style={{ flex: 1 }}>
            <ScrollDrum items={TIME_SLOTS} selectedIndex={slotIdx} onSelect={setSlotIdx} getLabel={s => s.label} />
          </div>
        </div>
        <div className={styles.pickerQuickWrap}>
          <div className={styles.pickerQuickDivider}>
            <div className={styles.pickerQuickLine} />
            <span className={styles.pickerQuickOr}>or drop now for</span>
            <div className={styles.pickerQuickLine} />
          </div>
          {(() => {
            const base = dropOff ? new Date(dropOff) : new Date();
            const viable = PRESETS.filter(p => isPresetViable(base, p.hours, timings));
            return viable.length > 0 ? (
              <div className={styles.pickerQuickChips}>
                {viable.map(p => (
                  <button key={p.hours} type="button" className={styles.pickerQuickChip}
                    onClick={() => onConfirm(addHours(base, p.hours))}>
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.presetsUnavailable}>⏰ No quick options fit opening hours</div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const router = useRouter();

  // Override globals.css `html, body { height: 100% }` which clamps the page
  // to viewport height and prevents the footer from being below the fold.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.height;
    const prevBody = body.style.height;
    html.style.height = "auto";
    body.style.height = "auto";
    return () => {
      html.style.height = prevHtml;
      body.style.height = prevBody;
    };
  }, []);

  // Navigation step: 0 = pick station, 1 = dates + bags, 2 = details + pay
  const [step, setStep] = useState(0);

  // Booking state (all lifted to top so panels can share it)
  const [station, setStation] = useState(null);        // confirmed selection
  const [pendingStation, setPendingStation] = useState(null); // highlighted in list/map, not yet confirmed
  const [dropOff, setDropOff] = useState(() => getRoundedNow());
  const [pickUp, setPickUp] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [timings, setTimings] = useState(null);
  const [small, setSmall] = useState(0);
  const [large, setLarge] = useState(0);
  const [capacity, setCapacity] = useState(null);
  const [checkingCap, setCheckingCap] = useState(false);

  // Payment step state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("+61");
  const [terms, setTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState(null);
  const [touched, setTouched] = useState({ email: false, phone: false });

  // DateTimePicker modal config (null = closed)
  const [picker, setPicker] = useState(null);

  // Map supporting state
  const [mapSearchResult, setMapSearchResult] = useState(null);

  // Station list state
  const [allStations, setAllStations] = useState([]);
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [listGeoResult, setListGeoResult] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);

  const suggestTimeout = useRef(null);
  const pendingSuggestion = useRef(null);
  const panel0Ref = useRef(null);
  const panel1Ref = useRef(null);
  const panel2Ref = useRef(null);
  const mapWrapperRef = useRef(null);
  const scrollRafRef = useRef(null);

  // ─── Computed values ─────────────────────────────────────────────────────────
  const hours = pickUp ? (new Date(pickUp) - new Date(dropOff)) / 3600000 : 0;
  const days = Math.max(1, Math.ceil(hours / 24));
  const total = (small * PRICING.small + large * PRICING.large) * days;
  const totalBags = small + large;
  const isPickUpValid = !!(pickUp && new Date(pickUp) > new Date(dropOff));
  const tooLong = days > MAX_DAYS;
  const dropOffOutside = !!(dropOff && timings && !isWithinOpenHours(dropOff, timings));
  const pickUpOutside = !!(pickUp && timings && !isWithinOpenHours(pickUp, timings));
  const hasHoursWarning = dropOffOutside || pickUpOutside;
  const formValid = name.trim() && EMAIL_RE.test(email) && phone.trim().length >= 6 && terms;
  const canGoToPay = isPickUpValid && !tooLong && !hasHoursWarning && totalBags > 0 && (!capacity || capacity.available !== false);
  const viablePresets = PRESETS.filter(p => isPresetViable(dropOff, p.hours, timings));

  const todayKey = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const todayTimings = timings?.[todayKey];
  const hoursLabel = timings?.is24Hours ? "24 hours"
    : todayTimings?.closed ? "closed today"
    : (todayTimings?.open && todayTimings?.close) ? `${todayTimings.open} – ${todayTimings.close}`
    : null;

  // ─── Scroll panel to top on step change + clear map height override ─────────
  useEffect(() => {
    if (step === 1 && panel1Ref.current) panel1Ref.current.scrollTop = 0;
    if (step === 2 && panel2Ref.current) panel2Ref.current.scrollTop = 0;
    // Remove inline height so CSS class takes over again
    if (mapWrapperRef.current) {
      mapWrapperRef.current.style.height = "";
      mapWrapperRef.current.style.transition = "";
    }
  }, [step]);

  // ─── Scroll-driven map resize (step 0 only) ───────────────────────────────────
  useEffect(() => {
    if (step !== 0) return;
    const panel = panel0Ref.current;
    if (!panel) return;
    const SCROLL_RANGE = 160; // px of scroll to go from mapTall → mapShort
    const onScroll = () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        const ratio = Math.min(1, panel.scrollTop / SCROLL_RANGE);
        const vh = 0.42 - (0.42 - 0.16) * ratio; // 42vh → 16vh
        if (mapWrapperRef.current) {
          mapWrapperRef.current.style.height = `${window.innerHeight * vh}px`;
          mapWrapperRef.current.style.transition = "height 0.12s ease-out";
        }
      });
    };
    panel.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      panel.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [step]);

  // ─── Fetch all stations on mount ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/station/list");
        const data = await res.json();
        const list = data.stations || [];
        setAllStations(list);
        setStations(list);
      } catch { /* silently fail — loadingStations → false still shows empty state */ }
      finally { setLoadingStations(false); }
    })();
  }, []);

  // ─── Sort by distance when user location becomes available ───────────────────
  useEffect(() => {
    if (!userCoords || allStations.length === 0) return;
    const lat = userCoords.latitude ?? userCoords.lat;
    const lon = userCoords.longitude ?? userCoords.lon;
    const sorted = [...allStations].map(s => {
      const c = getCoords(s);
      return c ? { ...s, distance: haversine(lat, lon, c.lat, c.lon) } : s;
    }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    setStations(sorted);
  }, [userCoords, allStations]);

  // ─── Fetch station opening timings when station is selected ──────────────────
  useEffect(() => {
    if (!station?._id) { setTimings(null); return; }
    fetch(`/api/station/${station._id}/timings`)
      .then(r => r.json())
      .then(d => d.success && setTimings(d.timings))
      .catch(() => setTimings({ is24Hours: true }));
  }, [station?._id]);

  // ─── Prefill name/email from previous booking ────────────────────────────────
  useEffect(() => {
    const n = localStorage.getItem("lt_prefill_name") || localStorage.getItem("username");
    const e = localStorage.getItem("lt_prefill_email") || localStorage.getItem("email");
    if (n) setName(n);
    if (e) setEmail(e);
  }, []);
  useEffect(() => { if (name) localStorage.setItem("lt_prefill_name", name); }, [name]);
  useEffect(() => { if (email) localStorage.setItem("lt_prefill_email", email); }, [email]);

  // ─── Capacity check (debounced) ───────────────────────────────────────────────
  useEffect(() => {
    if (!station?._id || !dropOff || !pickUp || totalBags === 0) { setCapacity(null); return; }
    setCheckingCap(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/station/capacity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stationId: station._id,
            dropOffDate: toLocalISO(dropOff),
            pickUpDate: toLocalISO(pickUp),
            luggageCount: totalBags,
          }),
        });
        setCapacity(await r.json());
      } catch { /* ignore */ }
      finally { setCheckingCap(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [station?._id, dropOff, pickUp, totalBags]);

  // ─── Station selection ────────────────────────────────────────────────────────
  const handleConfirmStation = useCallback((s) => {
    const isNewStation = station?._id !== s._id;
    setStation(s);
    setPendingStation(null);
    setStep(1);
    if (isNewStation) {
      // Only reset dates/bags if switching to a different station
      setDropOff(getRoundedNow());
      setPickUp(null);
      setSelectedPreset(null);
      setSmall(0);
      setLarge(0);
      setCapacity(null);
    }
  }, [station?._id]);

  // ─── Date/time setters ────────────────────────────────────────────────────────
  const setDropOffCustom = useCallback((d) => {
    setDropOff(d);
    setSelectedPreset(null);
    setPickUp(prev => (prev && prev <= d) ? null : prev);
  }, []);
  const setPickUpCustom = useCallback((d) => {
    setPickUp(d);
    setSelectedPreset(null);
  }, []);
  const choosePreset = useCallback((p) => {
    setSelectedPreset(p.hours);
    setPickUp(addHours(dropOff, p.hours));
  }, [dropOff]);

  // ─── Payment handler ──────────────────────────────────────────────────────────
  const handlePaymentSuccess = async (paymentData) => {
    setProcessing(true);
    try {
      const fd = {
        stationId: station._id,
        dropOffDate: toLocalISO(dropOff),
        pickUpDate: toLocalISO(pickUp),
        smallBagCount: small,
        largeBagCount: large,
        fullName: name,
        email,
        phone: `${phoneCode} ${phone}`,
        phoneCode,
        phoneNumber: phone,
        termsAccepted: terms,
        specialInstructions: "",
      };
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fd, luggageCount: totalBags, paymentData, totalAmount: total }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.bookingData) sessionStorage.setItem("lastBooking", JSON.stringify(data.bookingData));
        router.push("/Booked");
      } else {
        setPayError(data.message || "Booking failed. Please try again.");
        setProcessing(false);
      }
    } catch (err) {
      setPayError(`Something went wrong: ${err.message}`);
      setProcessing(false);
    }
  };

  // ─── Location ─────────────────────────────────────────────────────────────────
  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true); setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords(pos.coords);
        setLocating(false);
        setMapSearchResult({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "your location" });
        // Scroll list back to top so user sees sorted results from the start
        if (panel0Ref.current) panel0Ref.current.scrollTop = 0;
      },
      () => {
        setLocating(false); setLocateError(true);
        setTimeout(() => setLocateError(false), 4000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ─── Search / geocode ─────────────────────────────────────────────────────────
  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(suggestTimeout.current);
    if (!val.trim() || val.length < 2) {
      setSuggestions([]); setShowSuggestions(false);
      if (!val.trim()) { setListGeoResult(null); setCommittedSearch(""); }
      return;
    }
    suggestTimeout.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: val });
        if (userCoords) {
          params.set("lat", userCoords.latitude ?? userCoords.lat);
          params.set("lon", userCoords.longitude ?? userCoords.lon);
        }
        const coordsStr = allStations.map(s => { const c = getCoords(s); return c ? `${c.lat},${c.lon}` : null; }).filter(Boolean).join("|");
        if (coordsStr) params.set("coords", coordsStr);
        const cities = [...new Set(allStations.map(s => s.city?.trim()).filter(Boolean))].join(",");
        if (cities) params.set("cities", cities);
        const res = await fetch(`/api/geocode/autocomplete?${params}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions((data.suggestions || []).length > 0);
      } catch { setSuggestions([]); }
    }, 300);
  };

  const handleSearchSubmit = async () => {
    if (!search.trim()) return;
    setSuggestions([]); setShowSuggestions(false);
    const val = search.trim();
    const direct = allStations.filter(s =>
      s.name?.toLowerCase().includes(val.toLowerCase()) ||
      s.location?.toLowerCase().includes(val.toLowerCase()) ||
      s.suburb?.toLowerCase().includes(val.toLowerCase()) ||
      s.city?.toLowerCase().includes(val.toLowerCase())
    );
    if (direct.length > 0) { setCommittedSearch(val); setListGeoResult(null); return; }
    let result = null;
    if (pendingSuggestion.current?.label === search) {
      result = pendingSuggestion.current;
    } else {
      setGeocoding(true);
      result = await geocodeQuery(search);
      setGeocoding(false);
    }
    pendingSuggestion.current = null;
    const withDist = result
      ? allStations.map(s => { const c = getCoords(s); return c ? { ...s, distFromSearch: haversine(result.lat, result.lon, c.lat, c.lon) } : null; }).filter(Boolean).sort((a, b) => a.distFromSearch - b.distFromSearch)
      : [];
    setCommittedSearch(val);
    setListGeoResult({ area: val, stations: withDist, hasNearby: withDist.some(s => s.distFromSearch <= 10) });
    if (result) setMapSearchResult({ lat: result.lat, lon: result.lon, label: val });
  };

  const handleSuggestionSelect = (s) => {
    setSearch(s.label);
    setSuggestions([]); setShowSuggestions(false);
    pendingSuggestion.current = s;
  };

  const displayedStations = listGeoResult
    ? listGeoResult.stations
    : committedSearch
      ? allStations.filter(s =>
          s.name?.toLowerCase().includes(committedSearch.toLowerCase()) ||
          s.location?.toLowerCase().includes(committedSearch.toLowerCase()) ||
          s.suburb?.toLowerCase().includes(committedSearch.toLowerCase()) ||
          s.city?.toLowerCase().includes(committedSearch.toLowerCase())
        )
      : stations;

  // ─── PayPal formData object ───────────────────────────────────────────────────
  const payFormData = station ? {
    stationId: station._id,
    dropOffDate: dropOff ? toLocalISO(dropOff) : "",
    pickUpDate: pickUp ? toLocalISO(pickUp) : "",
    smallBagCount: small,
    largeBagCount: large,
    fullName: name,
    email,
    phone: `${phoneCode} ${phone}`,
    phoneCode,
    phoneNumber: phone,
    termsAccepted: terms,
    specialInstructions: "",
  } : null;

  // ─── Map config per step ──────────────────────────────────────────────────────
  const mapStations   = step === 0 ? displayedStations : (station ? [station] : []);
  const mapSelected   = step === 0 ? pendingStation : station;
  const mapOnSelect   = step === 0 ? (s) => setPendingStation(s) : () => {};
  const mapHeightCls  = step === 0 ? styles.mapTall : step === 1 ? styles.mapMedium : styles.mapShort;

  // ─── CTA button text / state (steps 0 and 1) ─────────────────────────────────
  const activeStation = pendingStation || station;
  const step0Disabled = !activeStation;
  const step1Disabled = !canGoToPay;
  const step1BtnText = !isPickUpValid ? "Select pick-up time to continue"
    : totalBags === 0 ? "Add at least 1 bag to continue"
    : hasHoursWarning ? "Adjust times to match opening hours"
    : tooLong ? `Max ${MAX_DAYS}-day booking exceeded`
    : capacity && !capacity.available ? "Station full — change station or dates"
    : `Continue to payment →`;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      <Header />

      <div className={styles.bookingFlow}>

      {/* ══════════ Step indicator ══════════ */}
      <div className={styles.stepBar}>
        {/* Left slot — back button on steps 1 & 2 */}
        <div className={styles.stepBarSide}>
          {step > 0 && (
            <button
              type="button"
              className={styles.stepBackBtn}
              aria-label="Go back"
              onClick={() => {
                if (step === 1) { setStep(0); setPendingStation(station); }
                if (step === 2) setStep(1);
              }}
            >←</button>
          )}
        </div>

        <div className={styles.stepItems}>
          {["Location", "When & bags", "Pay"].map((label, i) => (
            <div
              key={i}
              className={`${styles.stepItem} ${i === step ? styles.stepItemActive : i < step ? styles.stepItemDone : ""}`}
            >
              <div className={styles.stepDot}>{i < step ? "✓" : i + 1}</div>
              <div className={styles.stepLabel}>{label}</div>
              {i < 2 && <div className={`${styles.stepConnector} ${i < step ? styles.stepConnectorDone : ""}`} />}
            </div>
          ))}
        </div>

        {/* Right spacer — mirrors left slot width to keep indicators centered */}
        <div className={styles.stepBarSide} />
      </div>

      {/* ══════════ Station chip — visible on steps 1 & 2 ══════════ */}
      {step > 0 && station && (
        <div className={styles.chipBar}>
          <div className={styles.stationChip}>
            <span className={styles.chipPin}>📍</span>
            <span className={styles.chipName}>{station.name}</span>
          </div>
          <button
            type="button"
            className={styles.changeBtn}
            onClick={() => { setStep(0); setPendingStation(station); }}
          >
            Change
          </button>
        </div>
      )}

      {/* ══════════ Map — always visible, height changes per step ══════════ */}
      <div ref={mapWrapperRef} className={`${styles.mapWrapper} ${mapHeightCls}`}>
        <StationMapMapbox
          stations={mapStations}
          allStations={allStations}
          selected={mapSelected}
          onSelect={mapOnSelect}
          userCoords={userCoords}
          mapSearchResult={mapSearchResult}
          onClearMapSearch={() => setMapSearchResult(null)}
          onRouteUpdate={() => {}}
        />
      </div>

      {/* ══════════ Sliding content area ══════════ */}
      <div className={styles.contentArea}>
        <div
          className={styles.slidingTrack}
          style={{ transform: `translateX(${step * -33.3334}%)` }}
        >

          {/* ── Panel 0: Station list ─────────────────────────────────────────── */}
          <div ref={panel0Ref} className={styles.panel}>
            <div className={styles.panelInner}>

              {/* Search bar */}
              <div className={styles.searchSection}>
                <div className={styles.searchRow}>
                  <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                    <div className={`${styles.searchInputWrap} ${search ? styles.searchInputWrapActive : ""}`}>
                      <span className={styles.searchIcon}>{geocoding ? "⏳" : "🔍"}</span>
                      <input
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSearchSubmit(); } }}
                        placeholder="Search area or landmark…"
                        className={styles.searchInput}
                      />
                      {search && (
                        <>
                          <button type="button" onClick={handleSearchSubmit} className={styles.searchSubmitBtn}>→</button>
                          <button type="button" onClick={() => {
                            setSearch(""); setSuggestions([]); setShowSuggestions(false);
                            setListGeoResult(null); setCommittedSearch("");
                            pendingSuggestion.current = null;
                          }} className={styles.searchClearBtn}>✕</button>
                        </>
                      )}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <div className={styles.suggestionsDropdown}>
                        {suggestions.map((s, i) => (
                          <button key={i} type="button" className={styles.suggestionItem}
                            onMouseDown={() => handleSuggestionSelect(s)}>
                            <span>📍</span><span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={locateMe}
                    disabled={locating}
                    className={`${styles.nearMeBtn} ${userCoords ? styles.nearMeBtnActive : ""}`}
                  >
                    <span>{locating ? "⏳" : "📍"}</span>
                    <span className={styles.nearMeLabel}>{locating ? "Finding…" : userCoords ? "Near me ✓" : "Near me"}</span>
                  </button>
                </div>
                {locateError && (
                  <div className={styles.locateError}>🔒 Location access denied — enable it in settings</div>
                )}
              </div>

              {/* Station count line */}
              <div className={styles.stationCount}>
                {loadingStations
                  ? "Loading locations…"
                  : `${displayedStations.length} location${displayedStations.length !== 1 ? "s" : ""}${userCoords ? " · sorted by distance" : ""}`}
              </div>

              {/* Station cards */}
              <div className={styles.stationList}>
                {/* Far-from-stations notice — shown when GPS is set but user is in a different city */}
                {!loadingStations && userCoords && stations.length > 0 && (stations[0]?.distance ?? 0) > 50 && (
                  <div className={styles.noNearbyNotice}>
                    <span>📍</span>
                    <div>
                      <strong>No stations near you yet.</strong> Our locations are in Melbourne CBD — showing the nearest ones below.
                    </div>
                  </div>
                )}

                {loadingStations ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <span>Finding stations…</span>
                  </div>
                ) : displayedStations.length === 0 ? (
                  <div className={styles.emptyState}>No stations found{committedSearch ? ` for "${committedSearch}"` : ""}</div>
                ) : displayedStations.map(s => {
                  const isSel = pendingStation?._id === s._id || (!pendingStation && station?._id === s._id);
                  const isFull = s.capacity > 0 && s.currentCapacity >= s.capacity;
                  const openStatus = getOpenStatus(s.timings);
                  const distKm = s.distance ?? s.distFromSearch;
                  const todayT = s.timings?.[todayKey];
                  const hoursStr = s.timings?.is24Hours ? "24 hrs"
                    : todayT?.closed ? "Closed"
                    : (todayT?.open && todayT?.close) ? `${todayT.open}–${todayT.close}` : "";
                  let distLabel = null;
                  if (distKm != null) {
                    const km = parseFloat(distKm);
                    const walkMins = Math.round((km / 5) * 60);
                    const distStr = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
                    distLabel = `${distStr} · 🚶 ${walkMins} min`;
                  }
                  return (
                    <div
                      key={s._id}
                      onClick={() => !isFull && setPendingStation(isSel ? null : s)}
                      className={`${styles.stationCard} ${isSel ? styles.stationCardSel : ""} ${isFull ? styles.stationCardFull : ""}`}
                    >
                      {isSel && <div className={styles.stationCheck}>✓</div>}
                      <div className={styles.stationCardBody}>
                        <div className={styles.stationCardIcon}>🏪</div>
                        <div className={styles.stationCardInfo}>
                          <div className={styles.stationNameRow}>
                            <div className={styles.stationName}>{s.name}</div>
                            {openStatus !== "unknown" && (
                              <span className={openStatus === "open" ? styles.badgeOpen : styles.badgeClosed}>
                                {openStatus === "open" ? "Open" : "Closed"}
                              </span>
                            )}
                          </div>
                          <div className={styles.stationMeta}>
                            {s.location}{distLabel ? ` · ${distLabel}` : ""}{hoursStr ? ` · ${hoursStr}` : ""}
                          </div>
                          <div className={styles.stationTags}>
                            <span className={styles.tag}>⭐ {s.rating || "4.8"}</span>
                            {(s.features || []).slice(0, 2).map(f => (
                              <span key={f} className={styles.tag}>{f}</span>
                            ))}
                          </div>
                          <AvailBar current={s.currentCapacity || 0} max={s.capacity} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ height: 100 }} />
            </div>
          </div>

          {/* ── Panel 1: Dates + Bags ─────────────────────────────────────────── */}
          <div className={styles.panel} ref={panel1Ref}>
            <div className={styles.panelInner}>
              <div className={styles.sectionTitle}>When do you need it?</div>

              {/* Drop-off */}
              <div className={styles.dateSection}>
                <div className={styles.dateSectionLabel}>📦 Drop off</div>
                <button
                  type="button"
                  className={styles.timeCard}
                  onClick={() => setPicker({ title: "Drop-off Time", initialDate: dropOff, minDate: new Date(), onConfirm: setDropOffCustom, timings })}
                >
                  <div>
                    <div className={styles.timeCardTime}>{formatTime(dropOff)}</div>
                    <div className={styles.timeCardDate}>{formatDateFull(dropOff)}</div>
                  </div>
                  <div className={styles.timeCardRight}>
                    <div className={styles.timeCardTag}>Tap to change</div>
                    <span>✏️</span>
                  </div>
                </button>
              </div>

              {/* Quick presets */}
              <div className={styles.presetsDivider}>
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>or drop now for</span>
                <div className={styles.dividerLine} />
              </div>
              {viablePresets.length > 0 ? (
                <div className={styles.presetsRow}>
                  {viablePresets.map(p => (
                    <button key={p.hours} type="button"
                      onClick={() => choosePreset(p)}
                      className={`${styles.presetChip} ${selectedPreset === p.hours ? styles.presetChipActive : ""}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.presetsUnavailable}>⏰ No quick options within opening hours</div>
              )}

              {/* Pick-up */}
              <div className={styles.orDivider}>
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>or set exact pick-up</span>
                <div className={styles.dividerLine} />
              </div>
              <div className={styles.dateSection}>
                <div className={styles.dateSectionLabel}>📤 Pick up</div>
                <button
                  type="button"
                  className={`${styles.timeCard} ${!pickUp ? styles.timeCardEmpty : ""}`}
                  onClick={() => setPicker({
                    title: "Pick-up Time",
                    initialDate: pickUp || addHours(dropOff, 2),
                    minDate: addHours(dropOff, 0.25),
                    onConfirm: setPickUpCustom,
                    timings,
                    dropOff,
                  })}
                >
                  {pickUp ? (
                    <>
                      <div>
                        <div className={styles.timeCardTime}>{formatTime(pickUp)}</div>
                        <div className={styles.timeCardDate}>{formatDateFull(pickUp)}</div>
                      </div>
                      <div className={styles.timeCardRight}>
                        <div className={styles.timeCardTag}>Tap to change</div>
                        <span>✏️</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className={styles.timeCardPlaceholder}>Select pick-up time</div>
                        <div className={styles.timeCardPlaceholderSub}>Tap to choose date & time</div>
                      </div>
                      <span className={styles.timeCardPlus}>+</span>
                    </>
                  )}
                </button>
              </div>

              {/* Duration summary */}
              {isPickUpValid && (
                <div className={styles.durationRow}>
                  <span className={styles.durationLabel}>Duration:</span>
                  <span className={styles.durationVal}>
                    {hours < 24
                      ? `${Math.round(hours)} hour${Math.round(hours) !== 1 ? "s" : ""}`
                      : `${days} day${days > 1 ? "s" : ""}`}
                  </span>
                </div>
              )}

              {/* Opening hours notices */}
              {hoursLabel && !hasHoursWarning && (
                <div className={styles.hoursNote}>
                  ⏰ <strong>{station?.name}</strong> is open {hoursLabel}
                </div>
              )}
              {hasHoursWarning && (
                <div className={styles.hoursWarning}>
                  <span>⚠️</span>
                  <div>
                    <div><strong>Outside opening hours</strong></div>
                    {dropOffOutside && <div>Drop-off is outside station hours ({hoursLabel || "check hours"})</div>}
                    {pickUpOutside && <div>Pick-up is outside station hours ({hoursLabel || "check hours"})</div>}
                  </div>
                </div>
              )}
              {tooLong && (
                <div className={styles.hoursWarning}>
                  ⚠️ Max {MAX_DAYS}-day booking exceeded — select an earlier pick-up
                </div>
              )}

              {/* ── Bags ── */}
              <div className={styles.bagsDivider} />
              <div className={styles.sectionTitle}>How many bags?</div>

              {[
                { key: "small", label: "Small Bag",       desc: "Backpack, laptop bag, handbag",         price: PRICING.small, icon: "🎒", count: small, set: setSmall },
                { key: "large", label: "Large / Suitcase", desc: "Carry-on, full suitcase, sports bag",  price: PRICING.large, icon: "🧳", count: large, set: setLarge },
              ].map(bag => (
                <div key={bag.key} className={styles.bagCard}>
                  <div className={styles.bagCardTop}>
                    <span className={styles.bagIcon}>{bag.icon}</span>
                    <div className={styles.bagInfo}>
                      <div className={styles.bagName}>{bag.label}</div>
                      <div className={styles.bagDesc}>{bag.desc}</div>
                      <div className={styles.bagPrice}>
                        A${bag.price}<span className={styles.bagPricePer}>/day</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.counter}>
                    <button type="button"
                      onClick={() => bag.set(Math.max(0, bag.count - 1))}
                      className={styles.counterBtn}
                      disabled={bag.count === 0}
                      style={{ color: bag.count === 0 ? "#d1d5db" : "#0284c7" }}>−</button>
                    <div className={styles.counterVal}>{bag.count}</div>
                    <button type="button"
                      onClick={() => bag.set(bag.count + 1)}
                      className={`${styles.counterBtn} ${styles.counterBtnPlus}`}>+</button>
                  </div>
                  {bag.count > 0 && (
                    <div className={styles.bagSubtotal}>
                      {bag.count} × A${bag.price} × {days} day{days > 1 ? "s" : ""} ={" "}
                      <strong style={{ color: "#0284c7" }}>A${(bag.count * bag.price * days).toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              ))}

              {checkingCap && <div className={styles.checkingNote}>⏳ Checking availability…</div>}
              {capacity && !capacity.available && (
                <div className={styles.capacityFull}>⛔ Station is at capacity for those dates. Go back and choose different dates or a different station.</div>
              )}

              <div className={styles.insuranceNote}>
                🔐 All bags insured up to <strong>A$2,000</strong> per booking. No extra cost.
              </div>
              <div style={{ height: 120 }} />
            </div>
          </div>

          {/* ── Panel 2: Details + Pay ────────────────────────────────────────── */}
          <div className={styles.panel} ref={panel2Ref}>
            <div className={styles.panelInner}>

              {/* Booking summary */}
              {station && dropOff && pickUp && (
                <div className={styles.summaryCard}>
                  <div className={styles.summaryCardTitle}>Booking Summary</div>
                  {[
                    ["📍 Station",  station.name],
                    ["📦 Drop off", `${formatDate(dropOff)} ${formatTime(dropOff)}`],
                    ["📤 Pick up",  `${formatDate(pickUp)} ${formatTime(pickUp)}`],
                    small > 0 && ["🎒 Small bags", small],
                    large > 0 && ["🧳 Large bags", large],
                    ["📅 Duration", `${days} day${days > 1 ? "s" : ""}`],
                  ].filter(Boolean).map(([l, v]) => (
                    <div key={l} className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>{l}</span>
                      <strong className={styles.summaryVal}>{v}</strong>
                    </div>
                  ))}
                  <div className={styles.summaryTotal}>
                    <span>Total</span>
                    <span className={styles.summaryTotalAmt}>A${total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Personal details */}
              <div className={styles.detailsCard}>
                <div className={styles.detailsCardTitle}>Your Details</div>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className={styles.inputField}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setTouched(t => ({ ...t, email: true })); }}
                  placeholder="Email address"
                  className={styles.inputField}
                />
                {touched.email && email && !EMAIL_RE.test(email) && (
                  <div className={styles.fieldHint}>⚠️ Please enter a valid email</div>
                )}
                <div className={styles.phoneRow}>
                  <select
                    value={phoneCode}
                    onChange={e => setPhoneCode(e.target.value)}
                    className={`${styles.inputField} ${styles.phoneCode}`}
                  >
                    {["+61","+1","+44","+91","+65","+971","+81","+82","+86","+49","+33","+39","+34","+55","+52","+27","+234","+254","+60","+66","+84","+62","+92","+880","+94","+64","+353","+31","+46","+47","+45","+358","+48","+420","+36","+40","+7","+20","+212","+213"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 15)); setTouched(t => ({ ...t, phone: true })); }}
                    placeholder="Phone number"
                    className={`${styles.inputField} ${styles.phoneNum}`}
                  />
                </div>
                {touched.phone && phone && phone.length < 6 && (
                  <div className={styles.fieldHint}>⚠️ Phone must be at least 6 digits</div>
                )}
              </div>

              {/* Terms */}
              <label className={styles.termsRow}>
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={e => setTerms(e.target.checked)}
                  className={styles.termsCheck}
                />
                <span className={styles.termsText}>
                  I agree to the{" "}
                  <a href="/terms-&-conditions" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>Terms & Conditions</a>
                  {" "}and{" "}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>Privacy Policy</a>
                </span>
              </label>

              {/* Payment error */}
              {payError && (
                <div className={styles.payError}>
                  ⚠️ {payError}
                  <button type="button" onClick={() => setPayError(null)} className={styles.payErrorDismiss}>✕</button>
                </div>
              )}

              {/* Payment */}
              {processing ? (
                <div className={styles.processingState}>
                  <div className={styles.spinner} />
                  <div>
                    <div className={styles.processingTitle}>Processing payment…</div>
                    <div className={styles.processingSub}>Please don&apos;t close this window</div>
                  </div>
                </div>
              ) : formValid ? (
                <div className={styles.paypalWrap}>
                  <PayPalPayment
                    totalAmount={total}
                    onPaymentSuccess={handlePaymentSuccess}
                    formData={payFormData}
                    disabled={processing}
                    onProcessingChange={setProcessing}
                  />
                </div>
              ) : (
                <div className={styles.payBlocked}>
                  Fill in your details above and agree to terms to proceed to payment
                </div>
              )}

              <div style={{ height: 48 }} />
            </div>
          </div>

        </div>
      </div>

      {/* ══════════ Sticky CTA bar — steps 0 and 1 only ══════════ */}
      {step < 2 && (
        <div className={styles.ctaBar}>
          {step === 0 && (
            <button
              type="button"
              disabled={step0Disabled}
              className={`${styles.ctaBtn} ${step0Disabled ? styles.ctaBtnDisabled : ""}`}
              onClick={() => activeStation && handleConfirmStation(activeStation)}
            >
              {activeStation ? `Book ${activeStation.name} →` : "Select a location to continue"}
            </button>
          )}
          {step === 1 && (
            <>
              {totalBags > 0 && isPickUpValid && (
                <div className={styles.ctaTotalRow}>
                  <span className={styles.ctaTotalLabel}>
                    {totalBags} bag{totalBags !== 1 ? "s" : ""} · {days} day{days !== 1 ? "s" : ""}
                  </span>
                  <span className={styles.ctaTotalAmt}>A${total.toFixed(2)}</span>
                </div>
              )}
              <button
                type="button"
                disabled={step1Disabled}
                className={`${styles.ctaBtn} ${step1Disabled ? styles.ctaBtnDisabled : ""}`}
                onClick={() => !step1Disabled && setStep(2)}
              >
                {step1BtnText}
              </button>
            </>
          )}
        </div>
      )}

      {/* ══════════ DateTimePicker modal ══════════ */}
      {picker && (
        <DateTimePicker
          {...picker}
          onClose={() => setPicker(null)}
          onConfirm={(date) => { picker.onConfirm(date); setPicker(null); }}
        />
      )}

      </div>{/* end bookingFlow */}

      <Footer />

    </div>
  );
}
