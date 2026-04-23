"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import styles from "./VisualDateTimePicker.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// All dates are fake-UTC: UTC hour = Melbourne wall-clock hour

const WDAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getRoundedNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  const d = new Date(`${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:00Z`);
  const mins = d.getUTCMinutes();
  const rem = mins % 15;
  if (rem !== 0) d.setUTCMinutes(mins + (15 - rem), 0, 0);
  else d.setUTCSeconds(0, 0);
  return d;
};

const addHours = (date, h) => new Date(date.getTime() + h * 3600000);

const fmt12 = (date) => {
  const h = date.getUTCHours() % 12 || 12;
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m} ${date.getUTCHours() >= 12 ? 'pm' : 'am'}`;
};

const fmtDateFull = (date) =>
  `${WDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

// Generate next N days as Melbourne fake-UTC midnights
const getNextDays = (n = 14) => {
  const days = [];
  const now = getRoundedNow();
  for (let i = 0; i < n; i++) {
    days.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i)));
  }
  return days;
};

// Generate time slots every 15 minutes
const getTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const h12 = h % 12 || 12;
      const mm  = String(m).padStart(2, '0');
      slots.push({ h, m, label: `${h12}:${mm} ${h >= 12 ? 'pm' : 'am'}` });
    }
  }
  return slots;
};

const PRESETS = [
  { label: "2 hrs", hours: 2 },
  { label: "4 hrs", hours: 4 },
  { label: "Half day", hours: 6 },
  { label: "Full day", hours: 24 },
  { label: "2 days", hours: 48 },
  { label: "1 week", hours: 168 },
];

const DAYS = getNextDays(14);
const TIME_SLOTS = getTimeSlots();

// ─── Scroll Drum ──────────────────────────────────────────────────────────────

function ScrollDrum({ items, selectedIndex, onSelect, getLabel }) {
  const ref = useRef(null);
  const ITEM_H = 46;
  const PAD = 2; // items above/below center

  // Scroll to selected on mount
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = selectedIndex * ITEM_H;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== selectedIndex) onSelect(clamped);
  }, [items.length, selectedIndex, onSelect]);

  const scrollTo = (idx) => {
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
  };

  return (
    <div className={styles.drumWrap}>
      {/* Selection band */}
      <div className={styles.drumBand} />
      {/* Fade top */}
      <div className={styles.drumFadeTop} />
      {/* Fade bottom */}
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
            onClick={() => { onSelect(i); scrollTo(i); }}
          >
            {getLabel(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Date + Time Picker Panel ─────────────────────────────────────────────────

function DateTimePicker({ title, initialDate, minDate, onConfirm, onClose }) {
  const today    = getRoundedNow();
  const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
  const initDayIdx = Math.max(0, DAYS.findIndex((d) =>
    d.getUTCFullYear() === initialDate.getUTCFullYear() &&
    d.getUTCMonth()    === initialDate.getUTCMonth()    &&
    d.getUTCDate()     === initialDate.getUTCDate()
  ));
  const initSlotIdx = Math.max(0, TIME_SLOTS.findIndex(
    (s) => s.h === initialDate.getUTCHours() && s.m <= initialDate.getUTCMinutes()
  ));

  const [dayIdx, setDayIdx] = useState(initDayIdx);
  const [slotIdx, setSlotIdx] = useState(initSlotIdx);

  const result = useMemo(() => {
    const day = DAYS[dayIdx];
    const s   = TIME_SLOTS[slotIdx];
    return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), s.h, s.m, 0, 0));
  }, [dayIdx, slotIdx]);

  const isValid = result >= (minDate || getRoundedNow());

  return (
    <div className={styles.pickerOverlay}>
      <div className={styles.pickerSheet}>
        {/* Header */}
        <div className={styles.pickerHeader}>
          <button type="button" onClick={onClose} className={styles.pickerCancel}>Cancel</button>
          <span className={styles.pickerTitle}>{title}</span>
          <button
            type="button"
            onClick={() => isValid && onConfirm(result)}
            disabled={!isValid}
            className={`${styles.pickerSet} ${isValid ? styles.pickerSetActive : ""}`}
          >
            Set
          </button>
        </div>

        {/* Preview */}
        <div className={styles.pickerPreview}>
          <span className={styles.pickerPreviewText}>
            {fmtDateFull(DAYS[dayIdx])} · {TIME_SLOTS[slotIdx]?.label}
          </span>
          {!isValid && <span className={styles.pickerPreviewError}>Must be after minimum time</span>}
        </div>

        {/* Column labels */}
        <div className={styles.pickerCols}>
          <div className={styles.pickerColLabel}>Date</div>
          <div className={styles.pickerColDivider} />
          <div className={styles.pickerColLabel}>Time</div>
        </div>

        {/* Drums */}
        <div className={styles.pickerDrums}>
          <div className={styles.drumCol} style={{ flex: 1.5 }}>
            <ScrollDrum
              items={DAYS}
              selectedIndex={dayIdx}
              onSelect={setDayIdx}
              getLabel={(d) => {
                const same = (a, b) => a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
                if (same(d, today))    return "Today";
                if (same(d, tomorrow)) return "Tomorrow";
                return `${WDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
              }}
            />
          </div>
          <div className={styles.pickerDrumDivider} />
          <div className={styles.drumCol} style={{ flex: 1 }}>
            <ScrollDrum
              items={TIME_SLOTS}
              selectedIndex={slotIdx}
              onSelect={setSlotIdx}
              getLabel={(s) => s.label}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const VisualDateTimePicker = ({
  dropOffValue,
  pickUpValue,
  onChange,
  disabled = false,
}) => {
  const [openPicker, setOpenPicker] = useState(null); // "dropoff" | "pickup" | null
  const [selectedPreset, setSelectedPreset] = useState(null);

  const dropOff = dropOffValue ? new Date(dropOffValue) : null;
  const pickUp = pickUpValue ? new Date(pickUpValue) : null;

  const hours = dropOff && pickUp ? (pickUp - dropOff) / 3600000 : 0;
  const days = Math.max(1, Math.ceil(hours / 24));

  const emit = (name, date) => {
    onChange({ target: { name, value: toLocalISO(date) } });
  };

  const choosePreset = (preset) => {
    const base = dropOff || getRoundedNow();
    setSelectedPreset(preset.hours);
    if (!dropOff) emit("dropOffDate", base);
    emit("pickUpDate", addHours(base, preset.hours));
  };

  const setDropOffCustom = (date) => {
    setSelectedPreset(null);
    emit("dropOffDate", date);
    // Clear pickup if it's now invalid
    if (pickUp && pickUp <= addHours(date, 1)) {
      onChange({ target: { name: "pickUpDate", value: "" } });
    }
    setOpenPicker(null);
  };

  const setPickUpCustom = (date) => {
    setSelectedPreset(null);
    emit("pickUpDate", date);
    setOpenPicker(null);
  };

  // Station hours label for selected station
  // const getHoursLabel = () => {
  //   if (!stationTimings || stationTimings.is24Hours) return null;
  //   return null; // Parent shows timing warnings; no need to duplicate
  // };

  if (disabled) {
    return (
      <div className={styles.disabled}>
        <span className={styles.disabledIcon}>📍</span>
        <span className={styles.disabledText}>Select a station first to choose dates & times</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ── DROP OFF ── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>📦 Drop off</div>
        <button
          type="button"
          onClick={() => setOpenPicker("dropoff")}
          className={`${styles.timeCard} ${dropOff ? styles.timeCardFilled : styles.timeCardEmpty}`}
        >
          {dropOff ? (
            <>
              <div>
                <div className={styles.timeCardTime}>{fmt12(dropOff)}</div>
                <div className={styles.timeCardDate}>{fmtDateFull(dropOff)}</div>
              </div>
              <span className={styles.timeCardEdit}>✏️ Change</span>
            </>
          ) : (
            <>
              <span className={styles.timeCardPlaceholder}>Tap to set drop-off</span>
              <span className={styles.timeCardPlus}>+</span>
            </>
          )}
        </button>
      </div>

      {/* ── PRESETS ── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>⚡ Quick duration</div>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.hours}
              type="button"
              onClick={() => choosePreset(p)}
              className={`${styles.preset} ${selectedPreset === p.hours ? styles.presetActive : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>or set exact pick-up</span>
        <div className={styles.dividerLine} />
      </div>

      {/* ── PICK UP ── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>📤 Pick up</div>
        <button
          type="button"
          onClick={() => setOpenPicker("pickup")}
          className={`${styles.timeCard} ${pickUp ? styles.timeCardFilled : styles.timeCardEmpty}`}
        >
          {pickUp ? (
            <>
              <div>
                <div className={styles.timeCardTime}>{fmt12(pickUp)}</div>
                <div className={styles.timeCardDate}>{fmtDateFull(pickUp)}</div>
              </div>
              <span className={styles.timeCardEdit}>✏️ Change</span>
            </>
          ) : (
            <>
              <span className={styles.timeCardPlaceholder}>Tap to set pick-up</span>
              <span className={styles.timeCardPlus}>+</span>
            </>
          )}
        </button>
      </div>

      {/* ── DURATION SUMMARY ── */}
      {dropOff && pickUp && pickUp > dropOff && (
        <div className={styles.summary}>
          <div>
            <div className={styles.summaryLabel}>Duration</div>
            <div className={styles.summaryValue}>
              {hours < 24
                ? `${Math.round(hours)} hour${Math.round(hours) !== 1 ? "s" : ""}`
                : `${days} day${days > 1 ? "s" : ""}`}
            </div>
          </div>
          <div className={styles.summaryDivider} />
          <div>
            <div className={styles.summaryLabel}>From</div>
            <div className={styles.summaryValue} style={{ color: "var(--primary)" }}>
              A${(days * 3.99).toFixed(2)}
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}> /small bag</span>
            </div>
          </div>
          <div className={styles.summaryCheck}>✓</div>
        </div>
      )}

      {/* ── PICKERS ── */}
      {openPicker === "dropoff" && (
        <DateTimePicker
          title="Drop-off Time"
          initialDate={dropOff || getRoundedNow()}
          minDate={new Date()}
          onConfirm={setDropOffCustom}
          onClose={() => setOpenPicker(null)}
        />
      )}

      {openPicker === "pickup" && (
        <DateTimePicker
          title="Pick-up Time"
          initialDate={pickUp || addHours(dropOff || getRoundedNow(), 2)}
          minDate={addHours(dropOff || new Date(), 1)}
          onConfirm={setPickUpCustom}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  );
};

export default VisualDateTimePicker;