// Shared date formatting — wall-clock UTC model
// All dates stored as Melbourne wall-clock UTC (e.g. 9am Melbourne → 2026-05-10T09:00Z)
// Display always reads UTC parts — correct for any viewer's timezone

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateShort(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${String(d.getUTCFullYear()).slice(-2)}`;
}

export function formatTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const h = d.getUTCHours() % 12 || 12;
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getUTCHours() >= 12 ? 'pm' : 'am'}`;
}

export function formatDateTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const h = d.getUTCHours() % 12 || 12;
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = d.getUTCHours() >= 12 ? 'pm' : 'am';
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${String(d.getUTCFullYear()).slice(-2)}, ${h}:${m} ${ampm}`;
}

export function formatDateTimeLong(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const h = d.getUTCHours() % 12 || 12;
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = d.getUTCHours() >= 12 ? 'pm' : 'am';
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${h}:${m} ${ampm}`;
}

// Returns "Today", "Tomorrow", or "Fri, 10 May"
export function formatDateRelative(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const todayUTC = new Date();
  const todayKey   = `${todayUTC.getUTCFullYear()}-${todayUTC.getUTCMonth()}-${todayUTC.getUTCDate()}`;
  const tomorrowD  = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate() + 1));
  const tomorrowKey = `${tomorrowD.getUTCFullYear()}-${tomorrowD.getUTCMonth()}-${tomorrowD.getUTCDate()}`;
  const dKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  if (dKey === todayKey) return 'Today';
  if (dKey === tomorrowKey) return 'Tomorrow';
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// Convert any date to Melbourne wall-clock ISO string (for sending to API)
// Works correctly regardless of the browser's local timezone
export function toMelbourneISO(date) {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type).value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

// Get current Melbourne wall-clock time as a fake-UTC Date
export function getMelbourneNow() {
  const iso = toMelbourneISO(new Date());
  return new Date(iso + 'Z');
}
