"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { unstable_batchedUpdates } from "react-dom";
import dynamic from "next/dynamic";
import styles from "./BookingDrawer.module.css";
import PayPalPayment from "@/components/LuggagePay";

const StationMapMapbox = dynamic(() => import("./StationMapMapbox"), { ssr: false });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRoundedNow() {
  const d = new Date();
  const mins = d.getMinutes();
  // Round UP to next 15-min slot so drop-off is always in the future
  const rounded = Math.ceil(mins / 15) * 15;
  d.setMinutes(rounded, 0, 0);
  return d;
}

function addHours(date, h) {
  return new Date(date.getTime() + h * 3600000);
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-AU", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

function formatDateFull(date) {
  return new Date(date).toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function toLocalISO(date) {
  const d = new Date(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-") + "T" +
  [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
  ].join(":");
}

function calcDays(drop, pick) {
  return Math.max(1, Math.ceil((new Date(pick) - new Date(drop)) / 86400000));
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getCoords(station) {
  const c = station.coordinates?.coordinates || station.coordinates;
  if (!c) return null;
  if (Array.isArray(c) && c.length >= 2) return { lat: Number(c[1]), lon: Number(c[0]) };
  return null;
}

// Returns "open" | "closed" | "unknown" based on station timings + current time
function getOpenStatus(timings) {
  if (!timings) return "unknown";
  if (timings.is24Hours) return "open";
  const now = new Date();
  const day = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][now.getDay()];
  const t = timings[day];
  if (!t) return "unknown";
  if (t.closed) return "closed"; // explicitly marked closed
  if (!t.open || !t.close) return "unknown";
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const openMins  = Number(t.open.split(":")[0])  * 60 + Number(t.open.split(":")[1]);
  const closeMins = Number(t.close.split(":")[0]) * 60 + Number(t.close.split(":")[1]);
  // Handle cross-midnight (e.g. 22:00 – 02:00)
  if (closeMins < openMins) {
    return (nowMins >= openMins || nowMins <= closeMins) ? "open" : "closed";
  }
  return (nowMins >= openMins && nowMins < closeMins) ? "open" : "closed";
}

// Check if a given Date falls within station opening hours for that day
function isWithinOpenHours(date, timings) {
  if (!timings || timings.is24Hours) return true;
  const d   = new Date(date);
  const day = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][d.getDay()];
  const t   = timings[day];
  if (!t) return true; // unknown day — don't block
  if (t.closed) return false; // explicitly closed this day
  if (!t.open || !t.close) return true; // no hours set — don't block
  const mins     = d.getHours() * 60 + d.getMinutes();
  const openMins = Number(t.open.split(":")[0])  * 60 + Number(t.open.split(":")[1]);
  const closeMins = Number(t.close.split(":")[0]) * 60 + Number(t.close.split(":")[1]);
  // Handle cross-midnight
  if (closeMins < openMins) {
    return mins >= openMins || mins < closeMins; // strict < at close, consistent with standard hours
  }
  return mins >= openMins && mins < closeMins;
}

// Returns true if pick-up time (dropOff + hours) falls within open hours
// Drop-off validity is handled separately — don't double-block presets
function isPresetViable(dropOff, hours, timings) {
  if (!timings || timings.is24Hours) return true;
  const pickUp = addHours(dropOff, hours);
  return isWithinOpenHours(pickUp, timings);
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
const STEPS = ["station", "dates", "bags", "pay", "done"];
const STEP_LABELS = ["Station", "When", "Bags", "Pay", "✓"];

// Next 60 days + 15-min time slots for the drum picker
function getNext14Days() {
  const days = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function getTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push({ h, m, label: new Date(0,0,0,h,m).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true }) });
    }
  }
  return slots;
}

// DAYS and TIME_SLOTS computed fresh inside DateTimePicker to avoid stale dates

// ─── Availability bar ─────────────────────────────────────────────────────────
function AvailBar({ current, max }) {
  if (!max) return null;
  const pct = Math.min(100, (current / max) * 100);
  const free = max - current;
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

// ─── iOS-style Scroll Drum ────────────────────────────────────────────────────
function ScrollDrum({ items, selectedIndex, onSelect, getLabel }) {
  const ref      = useRef(null);
  const ITEM_H   = 44;
  const PAD      = 3;
  const snapTimer = useRef(null);

  // Set initial scroll position
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = selectedIndex * ITEM_H;
    // eslint-disable-next-line
  }, []);

  // When selectedIndex changes externally (e.g. click), scroll to it
  useEffect(() => {
    if (!ref.current) return;
    const current = Math.round(ref.current.scrollTop / ITEM_H);
    if (current !== selectedIndex) {
      ref.current.scrollTo({ top: selectedIndex * ITEM_H, behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    // Debounce: wait until scrolling stops, then snap to nearest item
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      // Snap scroll to exact position
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      if (clamped !== selectedIndex) onSelect(clamped);
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
  // Compute fresh on each mount so "Today" is always accurate
  const DAYS       = getNext14Days();
  const TIME_SLOTS = getTimeSlots();

  const d = new Date(initialDate);
  const initDay = Math.max(0, DAYS.findIndex(x => x.toDateString() === d.toDateString()));
  // Snap to nearest 15-min slot for this hour
  const nearestSlotMin = Math.round(d.getMinutes() / 15) * 15;
  const slotH = nearestSlotMin === 60 ? d.getHours() + 1 : d.getHours();
  const slotM = nearestSlotMin === 60 ? 0 : nearestSlotMin;
  const initSlot = Math.max(0, TIME_SLOTS.findIndex(s => s.h === slotH && s.m === slotM));

  const [dayIdx,  setDayIdx]  = useState(initDay);
  const [slotIdx, setSlotIdx] = useState(initSlot);

  const getResult = () => {
    const day  = new Date(DAYS[dayIdx]);
    const slot = TIME_SLOTS[slotIdx];
    day.setHours(slot.h, slot.m, 0, 0);
    return day;
  };

  const isValid = () => getResult() >= (minDate || new Date());

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  return (
    <div className={styles.pickerOverlay} onClick={onClose}>
      <div className={styles.pickerSheet} onClick={e => e.stopPropagation()}>
        {/* Header */}
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

        {/* Preview */}
        <div className={styles.pickerPreview}>
          <span className={styles.pickerPreviewText}>
            {formatDateFull(DAYS[dayIdx])} · {TIME_SLOTS[slotIdx]?.label}
          </span>
          {!isValid() && <span className={styles.pickerPreviewErr}>Must be after minimum time</span>}
        </div>

        {/* Column labels */}
        <div className={styles.pickerColLabels}>
          <div style={{ flex: 1.4, textAlign: "center" }} className={styles.pickerColLabel}>Date</div>
          <div style={{ flex: 1,   textAlign: "center" }} className={styles.pickerColLabel}>Time</div>
        </div>

        {/* Drums */}
        <div className={styles.pickerDrums}>
          <div style={{ flex: 1.4 }}>
            <ScrollDrum
              items={DAYS}
              selectedIndex={dayIdx}
              onSelect={setDayIdx}
              getLabel={d2 => {
                if (d2.toDateString() === today.toDateString()) return "Today";
                if (d2.toDateString() === tomorrow.toDateString()) return "Tomorrow";
                return d2.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
              }}
            />
          </div>
          <div className={styles.pickerDrumDivider} />
          <div style={{ flex: 1 }}>
            <ScrollDrum
              items={TIME_SLOTS}
              selectedIndex={slotIdx}
              onSelect={setSlotIdx}
              getLabel={s => s.label}
            />
          </div>
        </div>

        {/* Quick select footer */}
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
                  <button
                    key={p.hours}
                    type="button"
                    className={styles.pickerQuickChip}
                    onClick={() => onConfirm(addHours(base, p.hours))}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.presetsUnavailable}>
                ⏰ No quick options fit within opening hours
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Drag-to-close handle ─────────────────────────────────────────────────────
function DragHandle({ onClose }) {
  const startY   = useRef(null);
  const isDrag   = useRef(false);

  const onTouchStart = e => {
    startY.current = e.touches[0].clientY;
    isDrag.current = false;
  };
  const onTouchMove = e => {
    if (startY.current === null) return;
    if (e.touches[0].clientY - startY.current > 8) isDrag.current = true;
  };
  const onTouchEnd = () => {
    if (isDrag.current) onClose();
    startY.current = null;
    isDrag.current = false;
  };

  // Mouse drag support for desktop
  const onMouseDown = e => { startY.current = e.clientY; isDrag.current = false; };
  const onMouseMove = e => {
    if (startY.current === null) return;
    if (e.clientY - startY.current > 8) isDrag.current = true;
  };
  const onMouseUp = () => {
    if (isDrag.current) onClose();
    startY.current = null;
    isDrag.current = false;
  };

  return (
    <div
      className={styles.handleWrap}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={() => { if (!isDrag.current) onClose(); }}
    >
      <div className={styles.handle} />
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, onBack }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className={styles.progress}>
      {idx > 0 && (
        <button type="button" onClick={onBack} className={styles.backBtn}>← Back</button>
      )}
      <div className={styles.progressSteps}>
        {STEPS.slice(0, -1).map((s, i) => (
          <div key={s} className={styles.progressItem}>
            <div className={styles.progressDotWrap}>
              <div className={`${styles.progressDot} ${i < idx ? styles.dotDone : i === idx ? styles.dotActive : ""}`}>
                {i < idx ? "✓" : i + 1}
              </div>
              <div className={`${styles.progressLabel} ${i === idx ? styles.progressLabelActive : ""}`}>
                {STEP_LABELS[i]}
              </div>
            </div>
            {i < STEPS.length - 2 && (
              <div className={`${styles.progressLine} ${i < idx ? styles.lineDone : ""}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

// ─── Nominatim geocoder — proxied through /api/geocode to avoid SW CORS issues ─
async function geocodeQuery(q) {
  try {
    const res  = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.results?.length) return null;
    return { lat: data.results[0].lat, lon: data.results[0].lon };
  } catch { return null; }
}




// ─── Step 2: Station ──────────────────────────────────────────────────────────
function StepStation({ userCoords: initialCoords, onSelect, initialSearch }) {
  const [stations,      setStations]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [showMap,       setShowMap]       = useState(false);
  const [selected,      setSelected]      = useState(null);
  const [geocoding,     setGeocoding]     = useState(false);
  const [listGeoResult, setListGeoResult] = useState(null);
  const [committedSearch, setCommittedSearch] = useState("");
  const [suggestions,   setSuggestions]   = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userCoords,    setUserCoords]    = useState(initialCoords || null);
  const [locating,      setLocating]      = useState(false);
  const suggestTimeout = useRef(null);
  const pendingSuggestion = useRef(null);

  const [locateError, setLocateError] = useState(false);
  const [mapSearchResult, setMapSearchResult] = useState(null);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setSelected(null);
    setLocating(true);
    setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = pos.coords;
        setUserCoords(coords);
        setLocateError(false);
        setStations(prev =>
          prev
            .map(s => {
              const c = getCoords(s);
              return c ? { ...s, distance: haversine(coords.latitude, coords.longitude, c.lat, c.lon) } : s;
            })
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        );
        setSelected(null);
        setMapSearchResult({ lat: coords.latitude, lon: coords.longitude, label: "your location" });
        setLocating(false);
        setSearch("");
        setListGeoResult(null);
      },
      () => {
        setLocating(false);
        setLocateError(true);
        setTimeout(() => setLocateError(false), 5000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/station/list");
        const data = await res.json();
        let list   = data.stations || [];
        if (userCoords) {
          list = list
            .map(s => {
              const c = getCoords(s);
              return c ? { ...s, distance: haversine(userCoords.latitude, userCoords.longitude, c.lat, c.lon) } : s;
            })
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }
        setStations(list);

        // If opened with a pre-selected location chip, auto-search it
        if (initialSearch) {
          setSearch(initialSearch.label);
          setCommittedSearch(initialSearch.label);
          if (initialSearch.lat && initialSearch.lon) {
            const stationsWithDist = list
              .map(s => { const c = getCoords(s); return c ? { ...s, distFromSearch: haversine(initialSearch.lat, initialSearch.lon, c.lat, c.lon) } : null; })
              .filter(Boolean)
              .sort((a, b) => a.distFromSearch - b.distFromSearch);
            const hasNearby = stationsWithDist.some(s => s.distFromSearch <= 10);
            setListGeoResult({ area: initialSearch.label, stations: stationsWithDist, hasNearby });
          }
        }
      } catch { /* empty */ }
      finally { setLoading(false); }
    })();
  }, [userCoords]);

  const filtered = stations.filter(s =>
    !committedSearch ||
    s.name?.toLowerCase().includes(committedSearch.toLowerCase()) ||
    s.location?.toLowerCase().includes(committedSearch.toLowerCase()) ||
    s.suburb?.toLowerCase().includes(committedSearch.toLowerCase()) ||
    s.city?.toLowerCase().includes(committedSearch.toLowerCase())
  );

  const handleSearchChange = val => {
    setSearch(val);

    // Autocomplete suggestions only — station list does NOT change while typing
    clearTimeout(suggestTimeout.current);
    if (!val.trim() || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      suggestTimeout.current = setTimeout(async () => {
        try {
          const stationCoordsStr = stations
            .map(s => { const c = getCoords(s); return c ? `${c.lat},${c.lon}` : null; })
            .filter(Boolean)
            .join("|");

          const params = new URLSearchParams({ q: val });
          if (userCoords) {
            params.set("lat", userCoords.latitude ?? userCoords.lat);
            params.set("lon", userCoords.longitude ?? userCoords.lon);
          }
          if (stationCoordsStr) params.set("coords", stationCoordsStr);
          const stationCities = [...new Set(stations.map(s => s.city?.trim()).filter(Boolean))].join(",");
          if (stationCities) params.set("cities", stationCities);

          const res = await fetch(`/api/geocode/autocomplete?${params.toString()}`);
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions((data.suggestions || []).length > 0);
        } catch {
          setSuggestions([]);
        }
      }, 300);
    }

    // If cleared, reset list
    if (!val.trim()) {
      setListGeoResult(null);
    }
  };

  // Called when user hits → button or presses Enter
  const handleSearchSubmit = async () => {
    if (!search.trim()) return;
    setSuggestions([]);
    setShowSuggestions(false);

    const val = search.trim();
    const valLower = val.toLowerCase();

    // Check for direct station name/suburb/city matches first — skip geocoding if found
    const directMatches = stations.filter(s =>
      s.name?.toLowerCase().includes(valLower) ||
      s.location?.toLowerCase().includes(valLower) ||
      s.suburb?.toLowerCase().includes(valLower) ||
      s.city?.toLowerCase().includes(valLower)
    );

    if (directMatches.length > 0) {
      // Name match — just filter the list, no geocoding needed
      setCommittedSearch(val);
      setListGeoResult(null);
      return;
    }

    let result = null;

    // If user picked a suggestion, use its exact coords — no geocoding needed
    if (pendingSuggestion.current && pendingSuggestion.current.label === search) {
      result = { lat: pendingSuggestion.current.lat, lon: pendingSuggestion.current.lon };
    } else {
      setGeocoding(true);
      result = await geocodeQuery(search);
      setGeocoding(false);
    }
    pendingSuggestion.current = null;

    const stationsWithDist = result
      ? stations
          .map(s => { const c = getCoords(s); return c ? { ...s, distFromSearch: haversine(result.lat, result.lon, c.lat, c.lon) } : null; })
          .filter(Boolean)
          .sort((a, b) => a.distFromSearch - b.distFromSearch)
      : [];

    if (showMap && result) {
      // In map mode, don't update committedSearch — it only affects list filtering
      // and setting it to an area name (e.g. "Melbourne Museum") would make filtered=[]
      setSelected(null);
      setMapSearchResult({ lat: result.lat, lon: result.lon, label: search.trim() });
    } else if (!showMap) {
      setCommittedSearch(val);
      const hasNearby = stationsWithDist.some(s => s.distFromSearch <= 10);
      setListGeoResult({ area: search.trim(), stations: stationsWithDist, hasNearby });
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion.label);
    setSuggestions([]);
    setShowSuggestions(false);
    // Store coords for when user hits submit — don't sort yet
    pendingSuggestion.current = suggestion;
  };



  // Shared card renderer used by both normal list and geo-result list
  const renderCard = (s, distKm) => {
    const isFull     = s.capacity > 0 && s.currentCapacity >= s.capacity;
    const isSel      = selected?._id === s._id;
    const openStatus = getOpenStatus(s.timings);
    const todayDayKey = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
    const todayT = s.timings?.[todayDayKey];
    const hours = s.timings?.is24Hours ? "24 hours"
      : todayT?.closed ? "Closed today"
      : todayT?.open && todayT?.close ? `${todayT.open}–${todayT.close}`
      : "";

    // Walking time: 5km/h average pace
    let distLabel = null;
    if (distKm != null) {
      const km = parseFloat(distKm);
      const walkMins = Math.round((km / 5) * 60);
      const distStr = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
      distLabel = `${distStr} (🚶 ${walkMins} min)`;
    }

    return (
      <div
        key={s._id}
        onClick={() => !isFull && setSelected(s)}
        className={`${styles.stationCard} ${isSel ? styles.stationCardSelected : ""} ${isFull ? styles.stationCardFull : ""}`}
      >
        {isSel && <div className={styles.stationCheck}>✓</div>}
        <div className={styles.stationCardBody}>
          <div className={styles.stationCardIcon}>🏪</div>
          <div className={styles.stationCardInfo}>
            <div className={styles.stationNameRow}>
              <div className={styles.stationCardName}>{s.name}</div>
              {openStatus !== "unknown" && (
                <span className={openStatus === "open" ? styles.badgeOpen : styles.badgeClosed}>
                  {openStatus === "open" ? "Open now" : "Closed"}
                </span>
              )}
            </div>
            <div className={styles.stationCardMeta}>
              {s.location}{distLabel ? ` · ${distLabel}` : ""}{hours ? ` · ${hours}` : ""}
            </div>
            <div className={styles.stationCardTags}>
              <span className={styles.tag}>⭐ {s.rating || "4.8"}</span>
              {(s.features || []).slice(0, 2).map(f => (
                <span key={f} className={styles.tag}>{f}</span>
              ))}
            </div>
            <AvailBar current={s.currentCapacity || 0} max={s.capacity} />
          </div>
        </div>
        <div />
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <div className={styles.loadingText}>Finding stations…</div>
      </div>
    );
  }

  return (
    <div className={styles.screenWrap}>
      {/* Header — hidden in map mode, controls float on map instead */}
      <div className={styles.screenHeader} style={showMap ? { display: "none" } : {}}>
        <div className={styles.screenTitle}>Choose a Station</div>

        {/* ── Search field / Near a place ── */}
        <div className={styles.intentRow}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <div className={`${styles.searchRow} ${search ? styles.searchRowActive : ""}`}>
              <span className={styles.searchIcon}>{geocoding ? "⏳" : "🔍"}</span>
              <input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); setSelected(null); handleSearchSubmit(); } }}
                placeholder="Search area or landmark…"
                className={styles.searchInput}
              />
              {search && (
                <>
                  <button type="button" onClick={() => { setSelected(null); handleSearchSubmit(); }} className={styles.searchSubmit} title="Search">→</button>
                  <button type="button" onClick={() => { handleSearchChange(""); setSuggestions([]); setShowSuggestions(false); setListGeoResult(null); setCommittedSearch(""); pendingSuggestion.current = null; }} className={styles.searchClear}>✕</button>
                </>
              )}
            </div>
          </div>
          <div className={styles.intentDivider}>or</div>
          <button
            type="button"
            className={`${styles.intentBtn} ${userCoords ? styles.intentBtnActive : ""}`}
            onClick={() => { setSelected(null); locateMe(); }}
            disabled={locating}
          >
            <span className={styles.intentIcon}>{locating ? "⏳" : "📍"}</span>
            <span className={styles.intentLabel}>{locating ? "Finding you…" : userCoords ? "Near me ✓" : "Near me"}</span>
          </button>
          {/* Dropdown anchors to intentRow so it spans full width */}
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.suggestionsDropdown}>
              {suggestions.map((s, i) => (
                <button key={i} type="button" className={styles.suggestionItem} onMouseDown={() => handleSuggestionSelect(s)}>
                  <span className={styles.suggestionIcon}>📍</span>
                  <span className={styles.suggestionLabel}>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {locateError && (
          <div className={styles.locateErrorBanner}>
            🔒 Location access denied — enable it in your device settings
          </div>
        )}

        {/* ── Quick location chips ── */}
        {!search && !listGeoResult && (() => {
          // Build chips from station suburb+city — deduplicated
          const chipSet = new Map();
          stations.forEach(s => {
            if (s.suburb && s.city) {
              const label = `${s.suburb}, ${s.city}`;
              const c = getCoords(s);
              if (!chipSet.has(label) && c) chipSet.set(label, { label, lat: c.lat, lon: c.lon });
            } else if (s.city) {
              const label = s.city;
              const c = getCoords(s);
              if (!chipSet.has(label) && c) chipSet.set(label, { label, lat: c.lat, lon: c.lon });
            }
          });
          const chips = [...chipSet.values()].slice(0, 4);
          if (chips.length === 0) return null;
          return (
            <div className={styles.quickChipsRow}>
              <span className={styles.quickChipsLabel}>
                {userCoords ? "📍 Near you" : "⭐ Popular"}
              </span>
              {chips.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.quickChip}
                  onClick={() => {
                    const stationsWithDist = stations
                      .map(s => { const c = getCoords(s); return c ? { ...s, distFromSearch: haversine(chip.lat, chip.lon, c.lat, c.lon) } : null; })
                      .filter(Boolean)
                      .sort((a, b) => a.distFromSearch - b.distFromSearch);
                    const hasNearby = stationsWithDist.some(s => s.distFromSearch <= 10);
                    unstable_batchedUpdates(() => {
                      setSearch(chip.label);
                      setCommittedSearch(chip.label);
                      setSuggestions([]);
                      setShowSuggestions(false);
                      setListGeoResult({ area: chip.label, stations: stationsWithDist, hasNearby });
                    });
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          );
        })()}

        {/* ── Station count + map toggle ── */}
        <div className={styles.subRow}>
          <div className={styles.screenSub}>
            {(() => {
              const count = listGeoResult ? listGeoResult.stations.length : filtered.length;
              const label = listGeoResult
                ? `${count} station${count !== 1 ? "s" : ""} near "${listGeoResult.area}"`
                : `${count} station${count !== 1 ? "s" : ""}${userCoords ? " near you" : ""} · sorted by distance`;
              return label;
            })()}
          </div>
          <button
            type="button"
            onClick={() => setShowMap(v => !v)}
            className={`${styles.mapToggle} ${showMap ? styles.mapToggleOn : ""}`}
          >
            {showMap ? "📋 List" : "🗺️ Map"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={showMap ? styles.screenMapMode : styles.screenScroll}>
{showMap ? (
          <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", isolation: "isolate" }}>

            {/* Floating search bar */}
            <div style={{ position:"absolute", top:12, left:12, right:12, zIndex:1100, display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", gap:8 }}>
                {/* Search input */}
                <div style={{ flex:1, position:"relative" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, background:"white", borderRadius:14, padding:"10px 13px", boxShadow:"0 4px 20px rgba(0,0,0,0.18)" }}>
                    <span style={{ fontSize:13 }}>{geocoding ? "⏳" : "🔍"}</span>
                    <input
                      value={search}
                      onChange={e => handleSearchChange(e.target.value)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); setSelected(null); handleSearchSubmit(); } }}
                      placeholder="Search area or landmark…"
                      style={{ border:"none", outline:"none", fontSize:13, flex:1, background:"transparent", color:"#1e293b" }}
                    />
                    {search && (
                      <>
                        <button type="button" onClick={() => { setSelected(null); handleSearchSubmit(); }} style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", color:"#0284c7", padding:0 }}>→</button>
                        <button type="button" onClick={() => { handleSearchChange(""); setSuggestions([]); setShowSuggestions(false); setListGeoResult(null); setCommittedSearch(""); pendingSuggestion.current = null; }} style={{ background:"none", border:"none", fontSize:13, cursor:"pointer", color:"#94a3b8", padding:0 }}>✕</button>
                      </>
                    )}
                  </div>
                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"white", borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,0.15)", marginTop:4, overflow:"hidden", zIndex:500 }}>
                      {suggestions.map((s, i) => (
                        <button key={i} type="button" onMouseDown={() => handleSuggestionSelect(s)} style={{ width:"100%", textAlign:"left", padding:"10px 14px", border:"none", background:"none", cursor:"pointer", fontSize:12, color:"#1e293b", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #f1f5f9" }}>
                          <span>📍</span>{s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Near me button */}
                <button
                  type="button"
                  onClick={() => { setSelected(null); locateMe(); }}
                  disabled={locating}
                  style={{ display:"flex", alignItems:"center", gap:6, background: userCoords ? "#0284c7" : "white", borderRadius:14, padding:"10px 12px", boxShadow:"0 4px 16px rgba(0,0,0,0.15)", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}
                >
                  <span style={{ fontSize:13 }}>{locating ? "⏳" : "📍"}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: userCoords ? "white" : "#374151" }}>{locating ? "Finding…" : userCoords ? "Near me ✓" : "Near me"}</span>
                </button>
                {/* List toggle */}
                <button
                  type="button"
                  onClick={() => setShowMap(false)}
                  style={{ background:"white", borderRadius:14, padding:"10px 11px", boxShadow:"0 4px 16px rgba(0,0,0,0.15)", border:"none", cursor:"pointer", fontSize:11, fontWeight:700, color:"#374151" }}
                >
                  📋 List
                </button>
              </div>

              {/* Quick chips */}
              {!search && (() => {
                const chipSet = new Map();
                stations.forEach(s => {
                  if (s.suburb && s.city) { const label = `${s.suburb}, ${s.city}`; const c = getCoords(s); if (!chipSet.has(label) && c) chipSet.set(label, { label, lat:c.lat, lon:c.lon }); }
                  else if (s.city) { const label = s.city; const c = getCoords(s); if (!chipSet.has(label) && c) chipSet.set(label, { label, lat:c.lat, lon:c.lon }); }
                });
                const chips = [...chipSet.values()].slice(0, 3);
                if (!chips.length) return null;
                return (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {chips.map((chip, i) => (
                      <button key={i} type="button" onClick={() => { setSelected(null); setSearch(chip.label); setCommittedSearch(chip.label); setMapSearchResult({ lat:chip.lat, lon:chip.lon, label:chip.label }); }} style={{ background:"white", borderRadius:20, padding:"6px 12px", fontSize:11, fontWeight:600, color:"#0284c7", boxShadow:"0 2px 10px rgba(0,0,0,0.12)", border:"none", cursor:"pointer" }}>
                        📍 {chip.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Station count bubble — top left, below search bar */}
            <div style={{ position:"absolute", top:68, left:12, zIndex:900, background:"white", borderRadius:12, padding:"6px 10px", fontSize:11, color:"#64748b", boxShadow:"0 2px 10px rgba(0,0,0,0.12)", pointerEvents:"none" }}>
              {filtered.length} station{filtered.length !== 1 ? "s" : ""}{userCoords ? " near you" : ""}
            </div>

            <StationMapMapbox
              stations={filtered}
              allStations={stations}
              selected={selected}
              onSelect={s => setSelected(s)}
              onBook={s => { setSelected(s); onSelect(s); }}
              userCoords={userCoords}
              mapSearchResult={mapSearchResult}
              onClearMapSearch={() => setMapSearchResult(null)}
            />
          </div>
        ) : (
          <div className={styles.stationList}>
            {listGeoResult ? (
              <>
                {/* ── Direct matches section ── */}
                {filtered.length > 0 && (
                  <>
                    <div className={styles.geoResultHeader}>
                      <div className={styles.geoResultTitle}>
                        Stations in &ldquo;{listGeoResult.area}&rdquo;
                      </div>
                    </div>
                    {filtered.map(s => renderCard(s, null))}
                  </>
                )}

                {/* ── Nearby section ── */}
                {listGeoResult.stations.length > 0 && (
                  <>
                    <div className={styles.geoResultHeader}>
                      <div className={styles.geoResultTitle}>
                        {filtered.length > 0
                          ? `Nearest to "${listGeoResult.area}"`
                          : listGeoResult.hasNearby
                            ? `Stations near "${listGeoResult.area}"`
                            : `No stations near "${listGeoResult.area}"`}
                      </div>
                      {!listGeoResult.hasNearby && filtered.length === 0 && (
                        <div className={styles.geoResultSub}>Nearest stations sorted by distance</div>
                      )}
                    </div>
                    {listGeoResult.stations
                      .filter(s => !filtered.some(f => f._id === s._id)) // exclude already shown direct matches
                      .map(s => renderCard(s, s.distFromSearch != null ? s.distFromSearch : null))}
                  </>
                )}

                {/* ── Nothing at all ── */}
                {filtered.length === 0 && listGeoResult.stations.length === 0 && (
                  <div className={styles.emptyState}>No stations found for &ldquo;{listGeoResult.area}&rdquo;</div>
                )}
              </>
            ) : (
              <>
                {filtered.length === 0 && geocoding && (
                  <div className={styles.emptyState}>Searching&hellip;</div>
                )}
                {filtered.length === 0 && !geocoding && search && (
                  <div className={styles.emptyState}>No stations found for &ldquo;{search}&rdquo;</div>
                )}
                {filtered.map(s =>
                  renderCard(s, s.distance != null ? s.distance : null)
                )}
              </>
            )}
          </div>
        )}
      </div>

      {!showMap && selected && (
        <div className={styles.stickyBar}>
          <button type="button" onClick={() => onSelect(selected)} className={styles.ctaBlue}>
            Book {selected.name} →
          </button>
        </div>
      )}
    </div>
  );
}

function StepDates({ station, onDone, onChangeStation, onOpenPicker, staleNotice, onDismissStale }) {
  const [dropOff,       setDropOff]       = useState(getRoundedNow());
  const [pickUp,        setPickUp]        = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [timings,       setTimings]       = useState(null);

  // Load station timings
  useEffect(() => {
    if (!station?._id) return;
    fetch(`/api/station/${station._id}/timings`)
      .then(r => r.json())
      .then(d => d.success && setTimings(d.timings))
      .catch(() => setTimings({ is24Hours: true }));
  }, [station]);

  const choosePreset = p => {
    setSelectedPreset(p.hours);
    setPickUp(addHours(dropOff, p.hours));
  };

  const setDropOffCustom = d => {
    setDropOff(d);
    setSelectedPreset(null);
    if (pickUp && pickUp <= d) setPickUp(null);
  };

  const setPickUpCustom = d => {
    setPickUp(d);
    setSelectedPreset(null);
  };

  const hours   = pickUp ? (new Date(pickUp) - new Date(dropOff)) / 3600000 : 0;
  const days    = Math.max(1, Math.ceil(hours / 24));
  const isValid = pickUp && new Date(pickUp) > new Date(dropOff);
  const MAX_DAYS = 60;
  const tooLong  = days > MAX_DAYS;

  // Only show presets where both drop-off and pick-up land within open hours
  // If timings not loaded yet, show all (fallback)
  const viablePresets = PRESETS.filter(p => isPresetViable(dropOff, p.hours, timings));

  // Hours note — use today's actual day, not hardcoded monday
  const todayKey = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const todayTimings = timings?.[todayKey];
  const hoursLabel = timings?.is24Hours
    ? "24 hours"
    : todayTimings?.closed
      ? "closed today"
      : todayTimings?.open && todayTimings?.close
        ? `${todayTimings.open} – ${todayTimings.close}`
        : null;

  // Check if selected times fall outside station opening hours
  const dropOffOutside = dropOff && timings && !isWithinOpenHours(dropOff, timings);
  const pickUpOutside  = pickUp  && timings && !isWithinOpenHours(pickUp,  timings);
  const hasHoursWarning = dropOffOutside || pickUpOutside;

  return (
    <div className={styles.screenWrap}>
      <div className={styles.screenHeader}>
        <div className={styles.screenTitle}>When do you need it?</div>
        <div className={styles.stationPillRow}>
          <div className={styles.stationPill}>
            <span>📍</span> {station.name}
          </div>
          <button type="button" onClick={onChangeStation} className={styles.changeStationBtn}>
            Change
          </button>
        </div>
      </div>

      <div className={styles.screenScroll} style={{ paddingBottom: 100 }}>

        {/* ── Stale times notice ── */}
        {staleNotice && (
          <div className={styles.staleNotice}>
            <span>⏰</span>
            <span>Your previous drop-off time has passed — please select new times.</span>
            <button type="button" onClick={onDismissStale} className={styles.staleNoticeDismiss}>✕</button>
          </div>
        )}
        <div className={styles.dateSection}>
          <div className={styles.dateSectionLabel}>📦 Drop off</div>
          <button
            type="button"
            onClick={() => onOpenPicker({
              title: "Drop-off Time",
              initialDate: dropOff,
              minDate: new Date(),
              onConfirm: setDropOffCustom,
              timings,
            })}
            className={styles.timeCard}
          >
            <div>
              <div className={styles.timeCardTime}>{formatTime(dropOff)}</div>
              <div className={styles.timeCardDate}>{formatDateFull(dropOff)}</div>
            </div>
            <div className={styles.timeCardRight}>
              <div className={styles.timeCardTag}>Tap to change</div>
              <span className={styles.timeCardEdit}>✏️</span>
            </div>
          </button>
        </div>

        {/* ── PRESETS ── */}
        <div className={styles.dateSection}>
          <div className={styles.pickerQuickDivider}>
            <div className={styles.pickerQuickLine} />
            <span className={styles.pickerQuickOr}>or drop now for</span>
            <div className={styles.pickerQuickLine} />
          </div>
          {viablePresets.length > 0 ? (
            <div className={styles.pickerQuickChips}>
              {viablePresets.map(p => (
                <button
                  key={p.hours}
                  type="button"
                  onClick={() => choosePreset(p)}
                  className={`${styles.pickerQuickChip} ${selectedPreset === p.hours ? styles.pickerQuickChipActive : ""}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.presetsUnavailable}>
              ⏰ No quick options fit within opening hours — use the pick-up time selector below
            </div>
          )}
        </div>

        {/* ── DIVIDER ── */}
        <div className={styles.orDivider}>
          <div className={styles.orLine} />
          <span className={styles.orText}>or set exact pick-up</span>
          <div className={styles.orLine} />
        </div>

        {/* ── PICK UP ── */}
        <div className={styles.dateSection}>
          <div className={styles.dateSectionLabel}>📤 Pick up</div>
          <button
            type="button"
            onClick={() => onOpenPicker({
              title: "Pick-up Time",
              initialDate: pickUp || addHours(dropOff, 2),
              minDate: addHours(dropOff, 0.25),
              onConfirm: setPickUpCustom,
              timings,
              dropOff,
            })}
            className={`${styles.timeCard} ${!pickUp ? styles.timeCardEmpty : ""}`}
          >
            {pickUp ? (
              <>
                <div>
                  <div className={styles.timeCardTime}>{formatTime(pickUp)}</div>
                  <div className={styles.timeCardDate}>{formatDateFull(pickUp)}</div>
                </div>
                <div className={styles.timeCardRight}>
                  <div className={styles.timeCardTag}>Tap to change</div>
                  <span className={styles.timeCardEdit}>✏️</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className={styles.timeCardPlaceholder}>Select pick-up time</div>
                  <div className={styles.timeCardPlaceholderSub}>Tap to choose date &amp; time</div>
                </div>
                <span className={styles.timeCardPlus}>+</span>
              </>
            )}
          </button>
        </div>

        {/* ── DURATION SUMMARY ── */}
        {isValid && (
          <div className={styles.durationSummary}>
            <div>
              <div className={styles.durationLabel}>Total Duration</div>
              <div className={styles.durationVal}>
                {hours < 24
                  ? `${Math.round(hours)} hour${Math.round(hours) !== 1 ? "s" : ""}`
                  : `${days} day${days > 1 ? "s" : ""}`}
              </div>
            </div>
            <div />
          </div>
        )}

        {/* ── STATION HOURS NOTE ── */}
        {hoursLabel && !hasHoursWarning && (
          <div className={styles.hoursNote}>
            <span>⏰</span>
            <span>
              <strong>{station.name}</strong> is open {hoursLabel}.
            </span>
          </div>
        )}

        {/* ── OUTSIDE HOURS WARNING ── */}
        {hasHoursWarning && (
          <div className={styles.hoursWarning}>
            <span>⚠️</span>
            <div>
              <div className={styles.hoursWarningTitle}>Outside opening hours</div>
              <div className={styles.hoursWarningSub}>
                {dropOffOutside && <div>Drop-off time is outside {station.name}&apos;s hours ({hoursLabel || "check station hours"})</div>}
                {pickUpOutside  && <div>Pick-up time is outside {station.name}&apos;s hours ({hoursLabel || "check station hours"})</div>}
                <div>Please adjust your times or choose a 24-hour station.</div>
              </div>
            </div>
          </div>
        )}

        {/* ── TOO LONG WARNING ── */}
        {tooLong && (
          <div className={styles.hoursWarning}>
            <span>⚠️</span>
            <div>
              <div className={styles.hoursWarningTitle}>Maximum duration exceeded</div>
              <div className={styles.hoursWarningSub}>
                Bookings are limited to {MAX_DAYS} days. Please select an earlier pick-up date.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {isValid && (
        <div className={styles.stickyBar}>
          {hasHoursWarning ? (
            <div className={styles.hoursBlockedCta}>
              <span>⚠️ Adjust times to match opening hours before continuing</span>
            </div>
          ) : tooLong ? (
            <div className={styles.hoursBlockedCta}>
              <span>⚠️ Max {MAX_DAYS}-day booking exceeded — shorten your pick-up date</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onDone(dropOff, pickUp, hours)}
              className={styles.ctaBlue}
            >
              Continue to Bags →
            </button>
          )}
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── STEP 4: Bags ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function StepBags({ station, dropOff, pickUp, hours, initialSmall, initialLarge, onDone }) {
  const [small,    setSmall]    = useState(initialSmall || 0);
  const [large,    setLarge]    = useState(initialLarge || 0);
  const [capacity, setCapacity] = useState(null);
  const [checking, setChecking] = useState(false);

  const days  = Math.max(1, Math.ceil(hours / 24));
  const total = (small * PRICING.small + large * PRICING.large) * days;
  const totalBags = small + large;

  useEffect(() => {
    if (!station?._id || !dropOff || !pickUp || totalBags === 0) return;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/station/capacity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stationId:    station._id,
            dropOffDate:  toLocalISO(dropOff),
            pickUpDate:   toLocalISO(pickUp),
            luggageCount: totalBags,
          }),
        });
        const d = await r.json();
        setCapacity(d);
      } catch { /* ignore */ }
      finally { setChecking(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [station._id, dropOff, pickUp, totalBags]);

  const canProceed = totalBags > 0 && (!capacity || capacity.available !== false);

  return (
    <div className={styles.screenWrap}>
      <div className={styles.screenHeader}>
        <div className={styles.screenTitle}>How many bags?</div>
        <div className={styles.screenSub}>
          {formatDate(dropOff)} {formatTime(dropOff)} → {formatDate(pickUp)} {formatTime(pickUp)}
        </div>
      </div>

      <div className={styles.screenScroll} style={{ paddingBottom: 120 }}>
        {/* Bag types */}
        {[
          { key: "small", label: "Small Bag",        desc: "Backpack, laptop bag, handbag",           price: PRICING.small, icon: "🎒", count: small, set: setSmall },
          { key: "large", label: "Large / Suitcase", desc: "Carry-on, full suitcase, sports bag",     price: PRICING.large, icon: "🧳", count: large, set: setLarge },
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
              <button
                type="button"
                onClick={() => bag.set(Math.max(0, bag.count - 1))}
                className={styles.counterBtn}
                style={{ color: bag.count === 0 ? "#d1d5db" : "#0284c7" }}
                disabled={bag.count === 0}
              >−</button>
              <div className={styles.counterVal}>{bag.count}</div>
              <button
                type="button"
                onClick={() => bag.set(bag.count + 1)}
                className={`${styles.counterBtn} ${styles.counterBtnPlus}`}
              >+</button>
            </div>
            {bag.count > 0 && (
              <div className={styles.bagSubtotal}>
                {bag.count} × A${bag.price} × {days} day{days > 1 ? "s" : ""} = <strong style={{ color: "#0284c7" }}>A${(bag.count * bag.price * days).toFixed(2)}</strong>
              </div>
            )}
          </div>
        ))}

        {/* Capacity warning */}
        {checking && (
          <div className={styles.checkingNote}>⏳ Checking availability…</div>
        )}
        {capacity && !capacity.available && (
          <div className={styles.capacityFull}>
            ⛔ Station is at capacity for those dates. Please go back and choose a different station or dates.
          </div>
        )}

        {/* Insurance note */}
        <div className={styles.insuranceNote}>
          <span>🔐</span>
          <span>All bags covered up to <strong>A$2,000</strong> per booking. No extra cost.</span>
        </div>
      </div>

      {canProceed && totalBags > 0 && (
        <div className={styles.stickyBar}>
          <div className={styles.stickyTotal}>
            <span className={styles.stickyTotalLabel}>
              Total ({totalBags} bag{totalBags > 1 ? "s" : ""}, {days} day{days > 1 ? "s" : ""})
            </span>
            <span className={styles.stickyTotalAmt}>A${total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            onClick={() => onDone(small, large, total)}
            className={styles.ctaBlue}
          >
            Continue to Payment →
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── STEP 5: Pay ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function StepPay({ station, dropOff, pickUp, small, large, total, onDone }) {
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [phoneCode,  setPhoneCode]  = useState("+61");
  const [terms,      setTerms]      = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payError,   setPayError]   = useState(null);
  const [touched,    setTouched]    = useState({ email: false, phone: false });

  const days = calcDays(dropOff, pickUp);

  useEffect(() => {
    const n = localStorage.getItem("lt_prefill_name") || localStorage.getItem("username");
    const e = localStorage.getItem("lt_prefill_email") || localStorage.getItem("email");
    if (n) setName(n);
    if (e) setEmail(e);
  }, []);

  // Persist name/email for prefill on next booking
  useEffect(() => { if (name) localStorage.setItem("lt_prefill_name", name); }, [name]);
  useEffect(() => { if (email) localStorage.setItem("lt_prefill_email", email); }, [email]);

  const isValid = name.trim() && EMAIL_RE.test(email) && phone.trim().length >= 6 && terms;

  const formData = {
    stationId:    station._id,
    dropOffDate:  toLocalISO(dropOff),
    pickUpDate:   toLocalISO(pickUp),
    smallBagCount: small,
    largeBagCount:  large,
    fullName:     name,
    email,
    phone:        `${phoneCode} ${phone}`,
    phoneCode,
    phoneNumber:  phone,
    termsAccepted: terms,
    specialInstructions: "",
  };

  const handlePaymentSuccess = async paymentData => {
    setProcessing(true);
    try {
      const res  = await fetch("/api/booking", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...formData, luggageCount: small + large, paymentData, totalAmount: total }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.bookingData) sessionStorage.setItem("lastBooking", JSON.stringify(data.bookingData));
        onDone(data);
      } else {
        setPayError(data.message || "Booking failed. Please try again.");
        setProcessing(false);
      }
    } catch (err) {
      setPayError(`Something went wrong: ${err.message}. Please try again.`);
      setProcessing(false);
    }
  };

  return (
    <div className={styles.screenWrap}>
      <div className={styles.screenHeader}>
        <div className={styles.screenTitle}>Almost done!</div>
        <div className={styles.screenSub}>Review &amp; pay securely</div>
      </div>

      <div className={styles.screenScroll} style={{ paddingBottom: 140 }}>
        {/* Booking summary */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardTitle}>Booking Summary</div>
          {[
            ["📍 Station",  station.name],
            ["📦 Drop off", `${formatDate(dropOff)} ${formatTime(dropOff)}`],
            ["📤 Pick up",  `${formatDate(pickUp)}  ${formatTime(pickUp)}`],
            small > 0 && ["🎒 Small bags", small],
            large > 0 && ["🧳 Large bags", large],
            ["📅 Duration", `${days} day${days > 1 ? "s" : ""}`],
          ].filter(Boolean).map(([l, v]) => (
            <div key={l} className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>{l}</span>
              <strong className={styles.summaryRowVal}>{v}</strong>
            </div>
          ))}
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span className={styles.summaryTotalAmt}>A${total.toFixed(2)}</span>
          </div>
        </div>

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
            <div className={styles.fieldHint}>⚠️ Please enter a valid email address</div>
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
            <div className={styles.fieldHint}>⚠️ Phone number must be at least 6 digits</div>
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
            <a href="/terms-&-conditions" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>Terms &amp; Conditions</a>
            {" "}and{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>Privacy Policy</a>
          </span>
        </label>
      </div>

      {/* Payment sticky bar */}
      {payError && (
        <div className={styles.payError}>
          ⚠️ {payError}
          <button type="button" onClick={() => setPayError(null)} className={styles.payErrorDismiss}>✕</button>
        </div>
      )}
      <div className={styles.payBar}>
        {processing ? (
          <div className={styles.processingState}>
            <div className={styles.spinner} />
            <div>
              <div className={styles.processingTitle}>Processing payment…</div>
              <div className={styles.processingSub}>Please don&apos;t close this window</div>
            </div>
          </div>
        ) : isValid ? (
          <PayPalPayment
            totalAmount={total}
            onPaymentSuccess={handlePaymentSuccess}
            formData={formData}
            disabled={processing}
            onProcessingChange={setProcessing}
          />
        ) : (
          <div className={styles.payBlocked}>
            Fill in your details and accept the terms to pay
          </div>
        )}
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Drawer ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const DRAFT_KEY = "lt_booking_draft";

function saveDraft(state) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch {}
}
function loadDraft() {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

// Describes how far through the flow the draft is
function draftStepLabel(screen) {
  const labels = { station: "choosing a station", dates: "setting dates", bags: "selecting bags", pay: "payment details" };
  return labels[screen] || null;
}

export default function BookingDrawer({ isOpen, onClose, onOpen, initialSearch, preselectedStation }) {
  const [screen,      setScreen]      = useState("station");
  const [userCoords,  setUserCoords]  = useState(null);
  const [station,     setStation]     = useState(null);
  const [dropOff,     setDropOff]     = useState(null);
  const [pickUp,      setPickUp]      = useState(null);
  const [hours,       setHours]       = useState(0);
  const [small,       setSmall]       = useState(0);
  const [large,       setLarge]       = useState(0);
  const [total,       setTotal]       = useState(0);
  const [resumeModal, setResumeModal] = useState(false);
  const [picker,      setPicker]      = useState(null);
  const [staleTimesNotice, setStaleTimesNotice] = useState(false);
  const [freshKey,    setFreshKey]    = useState(0); // increments on startFresh to force StepStation remount

  const history = useRef([]);
  const bodyRef = useRef(null);
  const viaRef  = useRef("button"); // "pill" | "button" — how the drawer was last opened

  // Save draft whenever meaningful state changes — only if user confirmed past step 1
  useEffect(() => {
    if (screen === "done" || screen === "location" || screen === "station") return;
    saveDraft({ screen, userCoords, station, dropOff, pickUp, hours, small, large, total, history: history.current, confirmed: true });
  }, [screen, station, dropOff, pickUp, hours, small, large, total]);

  const applyDraft = (draft) => {
    if (!draft) return;
    const now = new Date();
    const draftDropOff = draft.dropOff ? new Date(draft.dropOff) : null;
    const datesStale   = draftDropOff && draftDropOff < now;

    unstable_batchedUpdates(() => {
      // If drop-off is in the past, send back to dates step with station preserved
      // but wipe the stale times so user picks fresh ones
      setScreen(datesStale ? "dates" : draft.screen);
      setUserCoords(draft.userCoords || null);
      setStation(draft.station || null);
      setDropOff(datesStale ? null : draftDropOff);
      setPickUp(datesStale  ? null : (draft.pickUp ? new Date(draft.pickUp) : null));
      setHours(datesStale   ? 0    : (draft.hours || 0));
      setSmall(draft.small  || 0);
      setLarge(draft.large  || 0);
      setTotal(datesStale   ? 0    : (draft.total || 0));
      setResumeModal(false);
      if (datesStale) setStaleTimesNotice(true);
    });
    history.current = datesStale ? ["station"] : (draft.history || []);
  };

  const resumeDraft = () => applyDraft(loadDraft());

  const startFresh = () => {
    clearDraft();
    history.current = [];
    unstable_batchedUpdates(() => {
      setScreen("station");
      setUserCoords(null);
      setStation(null);
      setDropOff(null);
      setPickUp(null);
      setHours(0);
      setSmall(0);
      setLarge(0);
      setTotal(0);
      setResumeModal(false);
      setStaleTimesNotice(false);
      setFreshKey(k => k + 1);
    });
  };

  console.log("screen:", screen, "station:", station, "resumeModal:", resumeModal);
  // On open: decide what to do based on how drawer was opened
    useEffect(() => {
    if (!isOpen) return;
    console.log("drawer opened, preselectedStation:", preselectedStation);

    // If a specific station was passed (from station page), skip straight to dates
    if (preselectedStation) {
      clearDraft();
      history.current = ["station"];
      unstable_batchedUpdates(() => {
        setStation(preselectedStation);
        setScreen("dates");
        setDropOff(null);
        setPickUp(null);
        setHours(0);
        setSmall(0);
        setLarge(0);
        setTotal(0);
        setResumeModal(false);
        setStaleTimesNotice(false);
        setFreshKey(k => k + 1);
      });
      return;
    }

    const draft = loadDraft();
    const hasValidDraft = draft && draft.confirmed && draft.station && draft.screen !== "done" && draft.screen !== "station";

    if (!hasValidDraft) {
      // No confirmed draft — always start fresh
      startFresh();
      return;
    }

    if (viaRef.current === "pill") {
      // Pill click — restore silently, jump straight to their step
      applyDraft(draft);
    } else {
      // Find Storage button clicked while pill was showing — show resume modal
      setResumeModal(true);
    }
    viaRef.current = "button"; // reset for next open
}, [isOpen, preselectedStation]); // eslint-disable-line

  const mountedRef = useRef(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    // If drawer closed while still on step 1 (never confirmed), wipe any stale draft
    // But NOT on initial mount — draft should survive a page refresh
    if (!isOpen && screen === "station" && mountedRef.current) clearDraft();
    mountedRef.current = true;
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, screen]);

  // Prevent Chrome iOS zoom on input focus inside the drawer
  // Chrome ignores font-size fixes when inputs are inside transformed containers
  useEffect(() => {
    if (!isOpen) return;
    const prevent = () => {
      document.documentElement.style.fontSize = "16px";
    };
    const restore = () => {
      document.documentElement.style.fontSize = "";
    };
    document.addEventListener("focusin",  prevent, true);
    document.addEventListener("focusout", restore, true);
    return () => {
      document.removeEventListener("focusin",  prevent, true);
      document.removeEventListener("focusout", restore, true);
      document.documentElement.style.fontSize = "";
    };
  }, [isOpen]);

  const go = next => {
    history.current.push(screen);
    setScreen(next);
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0 });
    });
  };

  const back = () => {
    const prev = history.current.pop();
    if (prev) {
      setScreen(prev);
      requestAnimationFrame(() => {
        bodyRef.current?.scrollTo({ top: 0 });
      });
    }
  };

  // Progress bar shows from dates step onwards — station is step 1, no back needed
  const showProgressBar = !["station", "done"].includes(screen);

  // Track draft existence as state so pill appears immediately on close
  const [draftData, setDraftData] = useState(() => loadDraft());
  useEffect(() => {
    if (!isOpen) setDraftData(loadDraft());
  }, [isOpen]);
  const hasDraft = !isOpen && draftData && draftData.confirmed && draftData.screen && draftData.screen !== "done" && draftData.station;

  return (
    <>
      {/* ── Booking in progress pill (shown when drawer is closed) ── */}
      {hasDraft && (
        <div className={styles.progressPill} onClick={() => {
          viaRef.current = "pill";
          onOpen?.();
        }}>
          <div className={styles.progressPillPulse} />
          <div className={styles.progressPillInfo}>
            <div className={styles.progressPillTop}>Booking in progress</div>
            <div className={styles.progressPillStation}>
              {draftData?.station ? draftData.station.name : draftStepLabel(draftData?.screen)}
            </div>
          </div>
          <div className={styles.progressPillCta}>Continue →</div>
        </div>
      )}

      {/* ── Backdrop ── */}
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}

      {/* ── Sheet ── */}
      <div className={`${styles.sheet} ${isOpen ? styles.sheetOpen : styles.sheetClosed}`}>
        <DragHandle onClose={onClose} />
        {showProgressBar && <ProgressBar step={screen} onBack={back} />}
        <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">✕</button>

        {/* ── DateTime Picker — takes full sheet height below progress bar ── */}
        {picker && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            <DateTimePicker
              title={picker.title}
              initialDate={picker.initialDate}
              minDate={picker.minDate}
              onConfirm={d => { picker.onConfirm(d); setPicker(null); }}
              onClose={() => setPicker(null)}
              timings={picker.timings}
              dropOff={picker.dropOff}
            />
          </div>
        )}

        <div ref={bodyRef} className={styles.sheetBody} style={picker ? { display: "none" } : {}}>

          {/* ── Resume modal ── */}
          {resumeModal && (
            <div className={styles.resumeModal}>
              <div className={styles.resumeIcon}>🧳</div>
              <div className={styles.resumeTitle}>Continue your booking?</div>
              <div className={styles.resumeSub}>
                You were {draftStepLabel(draftData?.screen)}
                {draftData?.station ? ` at ${draftData.station.name}` : ""}.
              </div>
              <button type="button" onClick={resumeDraft} className={styles.ctaBlue}>
                Continue booking →
              </button>
              <button type="button" onClick={startFresh} className={styles.ctaGhost}>
                Start a new booking
              </button>
            </div>
          )}

          {!resumeModal && screen === "station" && (
            <StepStation
              key={freshKey}
              userCoords={userCoords}
              onSelect={s => { setStation(s); go("dates"); }}
              initialSearch={initialSearch}
            />
          )}

          {!resumeModal && screen === "dates" && station && (
            <StepDates
              station={station}
              onDone={(d, p, h) => { setDropOff(d); setPickUp(p); setHours(h); go("bags"); }}
              onChangeStation={() => { setStation(null); back(); }}
              onOpenPicker={setPicker}
              staleNotice={staleTimesNotice}
              onDismissStale={() => setStaleTimesNotice(false)}
            />
          )}

          {!resumeModal && screen === "bags" && station && dropOff && pickUp && (
            <StepBags
              station={station}
              dropOff={dropOff}
              pickUp={pickUp}
              hours={hours}
              initialSmall={small}
              initialLarge={large}
              onDone={(s, l, t) => { setSmall(s); setLarge(l); setTotal(t); go("pay"); }}
            />
          )}

          {!resumeModal && screen === "pay" && station && dropOff && pickUp && (
            <StepPay
              station={station}
              dropOff={dropOff}
              pickUp={pickUp}
              small={small}
              large={large}
              total={total}
              onDone={data => { clearDraft(); onClose(); if (data.bookingData) sessionStorage.setItem("lastBooking", JSON.stringify(data.bookingData)); window.location.href = "/Booked"; }}
            />
          )}
        </div>
      </div>
    </>
  );
}