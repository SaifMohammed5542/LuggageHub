// ./src/app/admin/dashboard/page.js
"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import styles from "./AdminDashboard.module.css";
import { formatDateTime as fmtDT } from "@/lib/formatDate";


/**
 * Admin Dashboard (months-first view + compact toggle + CSV export + animated week accordions)
 *
 * Notes:
 * - This is a drop-in replacement for your AdminDashboard component.
 * - It keeps all existing API calls and admin flows: stations, partners, bookings, key handovers.
 * - New UX additions:
 *   - Shows partner payable (flat rate: A$2/small/day, A$4/large/day) in month cards, expanded month KPIs, week headers and optionally per-booking.
 *   - Shows station-level payable when a station is selected.
 */

// stable timing constant outside component so it's a stable reference for hooks
const defaultDayTiming = { open: "09:00", close: "18:00", closed: false };

export default function AdminDashboard() {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [showStationForm, setShowStationForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [token, setToken] = useState("");

  // Partner flat rates: A$2/small bag/day, A$4/large bag/day
  const SMALL_BAG_PARTNER_RATE = 2;
  const LARGE_BAG_PARTNER_RATE = 4;

  // toast state
  const [toast, setToast] = useState({ show: false, msg: "", type: "info" });
  const showToast = (msg, type = "info", duration = 3000) => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), duration);
  };

  // reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState({
    open: false, booking: null,
    dropOffDate: '', pickUpDate: '',
    note: '', loading: false, result: null,
    refunding: false, refundDone: null,
  });

  const openRescheduleModal = (booking) => {
    // Dates are wall-clock UTC — extract UTC parts so the input shows Melbourne time regardless of browser timezone
    const toLocal = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const pad = n => String(n).padStart(2, '0');
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    };
    setRescheduleModal({
      open: true, booking,
      dropOffDate: toLocal(booking.dropOffDate),
      pickUpDate:  toLocal(booking.pickUpDate),
      note: '', loading: false, result: null,
    });
  };

  const closeRescheduleModal = () =>
    setRescheduleModal(prev => ({ ...prev, open: false, loading: false }));

  const handlePartialRefund = async (booking, amount, fromModal = false) => {
    if (fromModal) setRescheduleModal(prev => ({ ...prev, refunding: true }));
    try {
      const res = await fetch(`/api/admin/bookings/${booking._id}/partial-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, note: `Rescheduled to shorter duration — refund of A$${Number(amount).toFixed(2)}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');
      // Update pending refund badge — use server-returned value (may still be > 0 if partial)
      const remaining = data.pendingRefundAmount ?? 0;
      setAllBookings(prev => prev.map(b => b._id === booking._id ? { ...b, pendingRefundAmount: remaining } : b));
      setFilteredBookings(prev => prev.map(b => b._id === booking._id ? { ...b, pendingRefundAmount: remaining } : b));
      if (fromModal) setRescheduleModal(prev => ({ ...prev, refunding: false, refundDone: { amount, refundId: data.refundId } }));
      showToast(`A$${Number(amount).toFixed(2)} refunded to customer`, 'success');
    } catch (err) {
      if (fromModal) setRescheduleModal(prev => ({ ...prev, refunding: false }));
      showToast(err.message, 'error');
    }
  };

  const handleReschedule = async () => {
    const { booking, dropOffDate, pickUpDate, note } = rescheduleModal;
    if (!dropOffDate || !pickUpDate) { showToast('Both dates are required', 'error'); return; }
    if (new Date(pickUpDate + ':00.000Z') <= new Date(dropOffDate + ':00.000Z')) { showToast('Pick-up must be after drop-off', 'error'); return; }
    setRescheduleModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/bookings/${booking._id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dropOffDate: dropOffDate + ':00.000Z', pickUpDate: pickUpDate + ':00.000Z', note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reschedule failed');
      setAllBookings(prev => prev.map(b => b._id === booking._id ? { ...b, dropOffDate: data.booking.dropOffDate, pickUpDate: data.booking.pickUpDate, totalAmount: data.booking.totalAmount, pendingRefundAmount: data.booking.pendingRefundAmount } : b));
      setFilteredBookings(prev => prev.map(b => b._id === booking._id ? { ...b, dropOffDate: data.booking.dropOffDate, pickUpDate: data.booking.pickUpDate, totalAmount: data.booking.totalAmount, pendingRefundAmount: data.booking.pendingRefundAmount } : b));
      setRescheduleModal(prev => ({ ...prev, loading: false, result: data }));
      showToast(data.message, 'success', 6000);
    } catch (err) {
      setRescheduleModal(prev => ({ ...prev, loading: false }));
      showToast(err.message, 'error');
    }
  };

  // cancel / refund modal state
  const [cancelModal, setCancelModal] = useState({
    open: false,
    booking: null,
    issueRefund: true,
    reason: "",
    loading: false,
    result: null,
  });

  const openCancelModal = (booking) =>
    setCancelModal({ open: true, booking, issueRefund: true, reason: "", loading: false, result: null });

  const closeCancelModal = () =>
    setCancelModal((prev) => ({ ...prev, open: false, loading: false }));

  const handleCancelRefund = async () => {
    const { booking, issueRefund, reason } = cancelModal;
    if (!reason.trim()) {
      showToast("Please enter a cancellation reason", "error");
      return;
    }
    setCancelModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/bookings/${booking._id}/cancel-refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason.trim(), issueRefund }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      // Update local booking status so UI reflects immediately
      setAllBookings((prev) =>
        prev.map((b) =>
          b._id === booking._id
            ? { ...b, status: "cancelled", cancellationReason: reason.trim() }
            : b
        )
      );
      setFilteredBookings((prev) =>
        prev.map((b) =>
          b._id === booking._id
            ? { ...b, status: "cancelled", cancellationReason: reason.trim() }
            : b
        )
      );

      setCancelModal((prev) => ({ ...prev, loading: false, result: data }));
      showToast(data.message, "success", 5000);
    } catch (err) {
      setCancelModal((prev) => ({ ...prev, loading: false }));
      showToast(err.message, "error");
    }
  };

  const formatSimpleDate = fmtDT;


//   const getPaymentStatus = (booking) => {
//   if (!booking.payments || booking.payments.length === 0) return "unpaid";

//   const latest = booking.payments[0];

//   return latest.status; // pending | completed | refunded | failed
// };



  // Station create form (kept)
  const [stationName, setStationName] = useState("");
  const [stationLocation, setStationLocation] = useState("");
  const [stationSuburb, setStationSuburb] = useState("");
  const [stationCity, setStationCity] = useState("");
  const [stationLatitude, setStationLatitude] = useState("");
  const [stationLongitude, setStationLongitude] = useState("");
  const [stationImages, setStationImages] = useState("");
  const [stationBank, setStationBank] = useState({
    accountHolderName: "",
    bankName: "",
    bsb: "",
    accountNumber: "",
    accountType: "savings",
    payoutEmail: "",
  });

  const [stationCapacity, setStationCapacity] = useState(10);

  const [stationTimings, setStationTimings] = useState({
    monday: { ...defaultDayTiming },
    tuesday: { ...defaultDayTiming },
    wednesday: { ...defaultDayTiming },
    thursday: { ...defaultDayTiming },
    friday: { ...defaultDayTiming },
    saturday: { ...defaultDayTiming },
    sunday: { ...defaultDayTiming },
    is24Hours: false,
  });

  // Partner create form
  const [partnerInfo, setPartnerInfo] = useState({
    username: "",
    password: "",
    email: "",
    phone: "",
    stationId: "",
  });

  // Partners list + editing
  const [partners, setPartners] = useState([]);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerFormVisibleForEdit, setPartnerFormVisibleForEdit] = useState(false);

  // Stations + selection
  const [stations, setStations] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState("");
  const [allKeyHandovers, setAllKeyHandovers] = useState([]);
  const [filteredKeyHandovers, setFilteredKeyHandovers] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [keyError, setKeyError] = useState("");
  const [activeView, setActiveView] = useState("bookings");

  // ── All-bookings inline panel ─────────────────────────────────────────────
  const [bookingsPanel, setBookingsPanel] = useState(null); // null | 'all' | 'cancelled'
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingSort, setBookingSort] = useState('dropOff'); // 'dropOff' | 'bookedAt'

  // ── Refund Requests state ────────────────────────────────────────────────────
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundRequestsLoading, setRefundRequestsLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, request: null, reason: '', loading: false });

  const fetchRefundRequests = async (tok) => {
    setRefundRequestsLoading(true);
    try {
      const res = await fetch('/api/admin/refund-requests?status=pending', { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      setRefundRequests(data.requests || []);
    } catch { /* silent */ }
    finally { setRefundRequestsLoading(false); }
  };

  const handleApproveRefund = async (request) => {
    if (!window.confirm(`Approve refund of A$${request.refundAmount.toFixed(2)} to ${request.bookingId?.fullName}?`)) return;
    try {
      const res = await fetch(`/api/admin/refund-requests/${request._id}/approve`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message, 'success');
      fetchRefundRequests(token);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleRejectRefund = async () => {
    if (!rejectModal.reason.trim()) { showToast('Rejection reason required', 'error'); return; }
    setRejectModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/admin/refund-requests/${rejectModal.request._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectModal.reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Request rejected', 'info');
      setRejectModal({ open: false, request: null, reason: '', loading: false });
      fetchRefundRequests(token);
    } catch (err) {
      showToast(err.message, 'error');
      setRejectModal(prev => ({ ...prev, loading: false }));
    }
  };

  // ── Payouts tab state ────────────────────────────────────────────────────────
  const [payoutSummaries, setPayoutSummaries] = useState([]);
  const [payoutSummariesLoading, setPayoutSummariesLoading] = useState(false);
  const [bonusOffers, setBonusOffers] = useState([]);
  const [bonusOffersLoading, setBonusOffersLoading] = useState(false);
  const [payoutTabLoaded, setPayoutTabLoaded] = useState(false);

  const [payoutModal, setPayoutModal] = useState({
    open: false, partner: null,
    amount: '', periodLabel: '', notes: '', loading: false,
  });

  const [newOffer, setNewOffer] = useState({
    show: false, name: '', description: '',
    type: 'rolling_window', threshold: '', windowDays: '', rewardAmount: '',
    loading: false,
  });

  // Station edit UI state
  const [showStationEditForm, setShowStationEditForm] = useState(false);
const [editStation, setEditStation] = useState({
  name: "",
  location: "",
  suburb: "",   // ADD
  city: "",     // ADD
  latitude: "",
  longitude: "",
});
  const [editStationImages, setEditStationImages] = useState("");
  const [editStationBank, setEditStationBank] = useState({
    accountHolderName: "",
    bankName: "",
    bsb: "",
    accountNumber: "",
    accountType: "savings",
    payoutEmail: "",
  });
  const [editStationTimings, setEditStationTimings] = useState({
    monday: { ...defaultDayTiming },
    tuesday: { ...defaultDayTiming },
    wednesday: { ...defaultDayTiming },
    thursday: { ...defaultDayTiming },
    friday: { ...defaultDayTiming },
    saturday: { ...defaultDayTiming },
    sunday: { ...defaultDayTiming },
    is24Hours: false,
  });
  const [editStationCapacity, setEditStationCapacity] = useState(10);

  // UX states: months-first
  const [expandedMonth, setExpandedMonth] = useState(null); // month string like "November 2025"
  const [openWeeks, setOpenWeeks] = useState({}); // { 'Nov 1 - Nov 7': true, ... }
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [compactView, setCompactView] = useState(true);

  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  // Add this useEffect at the top of your dashboard component
useEffect(() => {
  const init = async () => {
    const storedRole = localStorage.getItem("role");
    if (storedRole !== "admin") {
      router.push("/");
      return;
    }

    let activeToken = localStorage.getItem("token");

    try {
      const refreshRes = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        activeToken = refreshData.token;
        localStorage.setItem("token", activeToken);
      }
    } catch (e) {
      console.warn("Token refresh on mount failed:", e);
    }

    if (!activeToken) {
      router.push("/");
      return;
    }

    setToken(activeToken);
    setUserRole("admin");

    await Promise.all([
      fetchStations(activeToken),
      fetchBookings(activeToken),
      fetchKeyHandovers(activeToken),
      fetchPartners(activeToken),
      fetchRefundRequests(activeToken),
    ]);
  };

  init();
}, [router]);

useEffect(() => {
  const refreshInterval = setInterval(async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        setToken(data.token);
      }
    } catch (e) {
      console.warn("Background token refresh failed:", e);
    }
  }, 10 * 60 * 1000);

  return () => clearInterval(refreshInterval);
}, []);

  // Reset months panel when station or tab changes
  useEffect(() => {
    setExpandedMonth(null);
    setOpenWeeks({});
    setSelectedWeek(null);
  }, [selectedStation, activeTab]);

  // Lazy-load payouts tab data on first visit
  useEffect(() => {
    if (activeTab === 'payouts' && !payoutTabLoaded && token) {
      setPayoutTabLoaded(true);
      fetchPayoutSummaries(token);
      fetchBonusOffers(token);
    }
  }, [activeTab, token, payoutTabLoaded]);

  useEffect(() => {
    if (selectedStation) {
      const stationBookings = allBookings.filter((booking) => booking.stationId?._id === selectedStation._id);
      setFilteredBookings(stationBookings);

      const stationKeyHandovers = allKeyHandovers.filter((handover) => handover.stationId?._id === selectedStation._id);
      setFilteredKeyHandovers(stationKeyHandovers);

      const coords = selectedStation.coordinates?.coordinates || selectedStation.coordinates;
      let latValue = "";
      let lonValue = "";
      if (Array.isArray(coords) && coords.length === 2) {
        lonValue = String(coords[0]);
        latValue = String(coords[1]);
      } else {
        latValue =
          selectedStation.latitude !== undefined && selectedStation.latitude !== null ? String(selectedStation.latitude) : "";
        lonValue =
          selectedStation.longitude !== undefined && selectedStation.longitude !== null ? String(selectedStation.longitude) : "";
      }

      setEditStation({
        name: selectedStation.name || "",
        location: selectedStation.location || "",
        latitude: latValue,
        longitude: lonValue,
        suburb: selectedStation.suburb || "",
        city: selectedStation.city || "",
      });

      setEditStationBank({
        accountHolderName: selectedStation.bankDetails?.accountHolderName || "",
        bankName: selectedStation.bankDetails?.bankName || "",
        bsb: selectedStation.bankDetails?.bsb || "",
        accountNumber: selectedStation.bankDetails?.accountNumberEncrypted || "",
        accountType: selectedStation.bankDetails?.accountType || "savings",
        payoutEmail: selectedStation.bankDetails?.payoutEmail || "",
      });

      setEditStationTimings(
        selectedStation.timings || {
          monday: { ...defaultDayTiming },
          tuesday: { ...defaultDayTiming },
          wednesday: { ...defaultDayTiming },
          thursday: { ...defaultDayTiming },
          friday: { ...defaultDayTiming },
          saturday: { ...defaultDayTiming },
          sunday: { ...defaultDayTiming },
          is24Hours: false,
        }
      );

      setEditStationImages((selectedStation.images && selectedStation.images.join(", ")) || "");
      setEditStationCapacity(selectedStation.capacity || 10);
    }
    // include defaultDayTiming here so eslint won't complain that it's referenced above when creating timing defaults
  }, [selectedStation, allBookings, allKeyHandovers, defaultDayTiming]);

  /* -------------------------
     Helpers & Validation (kept mostly unchanged)
     ------------------------- */
  const handleStationBankChange = (field, value) => {
    setStationBank((prev) => ({ ...prev, [field]: value }));
  };
  const handleStationTimingChange = (day, field, value) => {
    setStationTimings((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };
  const handleStation24Toggle = () => setStationTimings((prev) => ({ ...prev, is24Hours: !prev.is24Hours }));
  const applyStationTimingToAllDays = (day) => {
    const dayTiming = stationTimings[day];
    const newTimings = {};
    daysOfWeek.forEach((d) => (newTimings[d] = { ...dayTiming }));
    setStationTimings((prev) => ({ ...prev, ...newTimings }));
  };

  const handleEditStationBankChange = (field, value) => setEditStationBank((prev) => ({ ...prev, [field]: value }));
  const handleEditStationTimingChange = (day, field, value) =>
    setEditStationTimings((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  const handleEditStation24Toggle = () => setEditStationTimings((prev) => ({ ...prev, is24Hours: !prev.is24Hours }));
  const applyEditTimingToAllDays = (day) => {
    const dayTiming = editStationTimings[day];
    const newTimings = {};
    daysOfWeek.forEach((d) => (newTimings[d] = { ...dayTiming }));
    setEditStationTimings((prev) => ({ ...prev, ...newTimings }));
  };

  const validateStationForm = () => {
    if (!stationName.trim()) return { ok: false, message: "Station name is required." };
    if (!stationLocation.trim()) return { ok: false, message: "Station location is required." };
    if (!String(stationLatitude).trim() || !String(stationLongitude).trim())
      return { ok: false, message: "Latitude and Longitude are required." };
    const lat = parseFloat(stationLatitude);
    const lon = parseFloat(stationLongitude);
    if (isNaN(lat) || isNaN(lon)) return { ok: false, message: "Latitude and Longitude must be valid numbers." };

    if (!stationBank.accountHolderName?.trim()) return { ok: false, message: "Account holder name is required." };
    if (!stationBank.bankName?.trim()) return { ok: false, message: "Bank name is required." };
    if (!stationBank.bsb?.trim()) return { ok: false, message: "BSB is required." };
    if (!stationBank.accountNumber?.trim()) return { ok: false, message: "Account number is required." };

    if (!stationTimings.is24Hours) {
      for (const d of daysOfWeek) {
        const dt = stationTimings[d];
        if (!dt) return { ok: false, message: `Timing for ${d} is missing.` };
        if (!dt.closed) {
  if (!dt.open || !dt.close) return { ok: false, message: `Open and close times required for ${d}.` };
}
      }
    }

    if (!Number.isInteger(stationCapacity) || stationCapacity < 10 || stationCapacity > 100) {
      return { ok: false, message: "Capacity must be an integer between 10 and 100." };
    }

    return { ok: true, message: "OK" };
  };
  const isStationFormValid = () => validateStationForm().ok;

  const handlePartnerField = (field, value) => setPartnerInfo((prev) => ({ ...prev, [field]: value }));
  const validatePartnerForm = () => {
    if (!partnerInfo.username?.trim()) return { ok: false, message: "Username is required." };
    if (!partnerInfo.email?.trim()) return { ok: false, message: "Email is required." };
    if (!partnerInfo.password || partnerInfo.password.length < 6) return { ok: false, message: "Password (min 6 chars) is required." };
    if (!partnerInfo.stationId) return { ok: false, message: "Station selection is required." };
    return { ok: true };
  };

  const getWeekRange = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const formatDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

const getBookingAmount = (booking) => {
  // CASE 1: New bookings (source of truth)
  if (booking?.totalAmount != null && booking.totalAmount > 0) {
    return Number(booking.totalAmount);
  }

  const dropOff = new Date(booking.dropOffDate);
  const pickUp = new Date(booking.pickUpDate);
  const days = Math.max(1, Math.ceil((pickUp - dropOff) / (1000 * 60 * 60 * 24)));

  const smallCount = booking.smallBagCount || 0;
  const largeCount = booking.largeBagCount || 0;

  // CASE 2: Has bag breakdown
  if (smallCount > 0 || largeCount > 0) {
    const total =
      smallCount * days * 3.99 +
      largeCount * days * 8.49;

    return Number(total.toFixed(2));
  }

  // CASE 3: Very old legacy bookings
  const legacyTotal = (booking.luggageCount || 0) * days * 7.99;
  return Number(legacyTotal.toFixed(2));
};


  const calculateTotalAmount = (bookings) => bookings.reduce((t, b) => t + getBookingAmount(b), 0);

  const getBookingPartnerShare = (booking) => {
    const dropOff = new Date(booking.dropOffDate);
    const pickUp = new Date(booking.pickUpDate);
    const days = Math.max(1, Math.ceil((pickUp - dropOff) / (1000 * 60 * 60 * 24)));
    const smallCount = booking.smallBagCount || 0;
    const largeCount = booking.largeBagCount || 0;
    if (smallCount > 0 || largeCount > 0) {
      return Number(((smallCount * days * SMALL_BAG_PARTNER_RATE) + (largeCount * days * LARGE_BAG_PARTNER_RATE)).toFixed(2));
    }
    // Legacy bookings with only luggageCount — treat as small bags
    return Number(((booking.luggageCount || 0) * days * SMALL_BAG_PARTNER_RATE).toFixed(2));
  };

  const calculateTotalPartnerShare = (bookings) => bookings.reduce((t, b) => t + getBookingPartnerShare(b), 0);

  const groupBookingsByMonth = (bookings) => {
    const monthlyGrouped = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.dropOffDate);
      const monthYear = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      if (!monthlyGrouped[monthYear]) monthlyGrouped[monthYear] = [];
      monthlyGrouped[monthYear].push(booking);
    });

    const sortedMonths = Object.entries(monthlyGrouped).sort(([a], [b]) => new Date(b + " 1") - new Date(a + " 1"));

    return sortedMonths.map(([month, monthBookings]) => {
      const weeklyGrouped = {};
      monthBookings.forEach((booking) => {
        const date = new Date(booking.dropOffDate);
        const weekRange = getWeekRange(date);
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day);
        if (!weeklyGrouped[weekRange]) weeklyGrouped[weekRange] = { bookings: [], weekStart };
        weeklyGrouped[weekRange].bookings.push(booking);
      });
      const sortedWeeks = Object.entries(weeklyGrouped).sort(([, a], [, b]) => b.weekStart - a.weekStart);
      return [month, sortedWeeks];
    });
  };

  const groupKeyHandoversByMonth = (handovers) => {
    const monthlyGrouped = {};
    handovers.forEach((handover) => {
      const date = new Date(handover.handoverDate);
      const monthYear = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      if (!monthlyGrouped[monthYear]) monthlyGrouped[monthYear] = [];
      monthlyGrouped[monthYear].push(handover);
    });

    const sortedMonths = Object.entries(monthlyGrouped).sort(([a], [b]) => new Date(b + " 1") - new Date(a + " 1"));

    return sortedMonths.map(([month, monthHandovers]) => {
      const weeklyGrouped = {};
      monthHandovers.forEach((handover) => {
        const date = new Date(handover.handoverDate);
        const weekRange = getWeekRange(date);
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day);
        if (!weeklyGrouped[weekRange]) weeklyGrouped[weekRange] = { handovers: [], weekStart };
        weeklyGrouped[weekRange].handovers.push(handover);
      });
      const sortedWeeks = Object.entries(weeklyGrouped).sort(([, a], [, b]) => b.weekStart - a.weekStart);
      return [month, sortedWeeks];
    });
  };

  /* ---------------------------
     Safe response parser
     --------------------------- */

  // Safe response parser: returns { ok, status, json, text, headers }
  async function safeParseResponse(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    let json = null;
    let text = null;

    if (ct.includes("application/json")) {
      try {
        // prefer json when the content-type is JSON
        json = await res.json();
      } catch (err) {
        console.error("Failed to parse JSON response:", err);
        // fallback to text
        try {
          text = await res.text();
        } catch (tErr) {
          console.error("Also failed to read text fallback:", tErr);
        }
      }
    } else {
      // not JSON — read as text (usually HTML error page)
      try {
        text = await res.text();
      } catch (err) {
        console.error("Failed to read text response:", err);
      }
    }

    return { ok: res.ok, status: res.status, json, text, headers: res.headers };
  }

  /* ---------------------------
     API calls (replaced to use safeParseResponse)
     --------------------------- */

  // Stations
  const fetchStations = async (authToken) => {
    try {
      const res = await fetch("/api/admin/station", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const parsed = await safeParseResponse(res);

      if (!parsed.ok) {
        console.error("fetchStations error:", parsed.status, parsed.json ?? parsed.text);
        showToast(parsed.json?.error || `Failed to load stations (status ${parsed.status})`, "error");
        return;
      }

      const data = parsed.json || {};
      setStations(data.stations || []);
    } catch (err) {
      console.error("Failed to fetch stations:", err);
      showToast("Failed to load stations", "error");
    }
  };

  // Bookings
  const fetchBookings = async (authToken) => {
    setLoadingBookings(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const parsed = await safeParseResponse(res);

      if (!parsed.ok) {
        console.error("fetchBookings error:", parsed.status, parsed.json ?? parsed.text);
        const msg = parsed.json?.error || `Failed to fetch bookings (status ${parsed.status})`;
        throw new Error(msg);
      }

      const data = parsed.json || { bookings: [] };
      const sortedBookings = [...(data.bookings || [])].sort((a, b) => new Date(b.dropOffDate) - new Date(a.dropOffDate));
      setAllBookings(sortedBookings);
    } catch (err) {
      setBookingError(err.message);
      showToast("Failed to load bookings", "error");
    } finally {
      setLoadingBookings(false);
    }
  };

  // Key handovers
  const fetchKeyHandovers = async (authToken) => {
    setLoadingKeys(true);
    try {
      const res = await fetch("/api/admin/key-handovers", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const parsed = await safeParseResponse(res);

      if (!parsed.ok) {
        console.error("fetchKeyHandovers error:", parsed.status, parsed.json ?? parsed.text);
        throw new Error(parsed.json?.error || `Failed to fetch key handovers (status ${parsed.status})`);
      }

      const data = parsed.json || { handovers: [] };
      const sortedHandovers = [...(data.handovers || [])].sort((a, b) => new Date(b.handoverDate) - new Date(a.handoverDate));
      setAllKeyHandovers(sortedHandovers);
    } catch (err) {
      setKeyError(err.message);
      showToast("Failed to load key handovers", "error");
    } finally {
      setLoadingKeys(false);
    }
  };

  // Payout summaries
  const fetchPayoutSummaries = async (authToken) => {
    setPayoutSummariesLoading(true);
    try {
      const res = await fetch('/api/admin/partner-payouts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) throw new Error(parsed.json?.error || 'Failed to load payout summaries');
      setPayoutSummaries(parsed.json?.summaries || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPayoutSummariesLoading(false);
    }
  };

  // Bonus offers list
  const fetchBonusOffers = async (authToken) => {
    setBonusOffersLoading(true);
    try {
      const res = await fetch('/api/admin/bonus-offers', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) throw new Error(parsed.json?.error || 'Failed to load bonus offers');
      setBonusOffers(parsed.json?.offers || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBonusOffersLoading(false);
    }
  };

  // Partners: fetch list
  const fetchPartners = async (authToken) => {
    try {
      const res = await fetch("/api/admin/partner", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const parsed = await safeParseResponse(res);

      if (!parsed.ok) {
        console.error("fetchPartners error:", parsed.status, parsed.json ?? parsed.text);
        showToast(parsed.json?.error || `Failed to load partners (status ${parsed.status})`, "error");
        return;
      }

      const data = parsed.json || {};
      setPartners(data.partners || []);
    } catch (err) {
      console.error("Failed to fetch partners:", err);
      showToast("Failed to load partners", "error");
    }
  };

  // Create station (uses validateStationForm)
  const handleCreateStation = async () => {
    const validation = validateStationForm();
    if (!validation.ok) {
      showToast(validation.message, "error");
      return;
    }

    const lat = parseFloat(stationLatitude);
    const lon = parseFloat(stationLongitude);
    const imagesArr = stationImages ? stationImages.split(",").map((i) => i.trim()).filter(Boolean) : [];

    try {
      const res = await fetch("/api/admin/station", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: stationName.trim(),
          location: stationLocation.trim(),
          suburb: stationSuburb.trim(),
          city: stationCity.trim(),
          latitude: lat,
          longitude: lon,
          images: imagesArr,
          bankDetails: {
            accountHolderName: stationBank.accountHolderName.trim(),
            bankName: stationBank.bankName.trim(),
            bsb: stationBank.bsb.trim(),
            accountNumberEncrypted: stationBank.accountNumber.trim(),
            accountType: stationBank.accountType,
            payoutEmail: stationBank.payoutEmail.trim() || undefined,
          },
          timings: { ...stationTimings },
          capacity: stationCapacity,
          description: "",
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        showToast("Station created successfully!", "success");
        // reset
        setStationName("");
        setStationLocation("");
        setStationSuburb("");
        setStationCity("");
        setStationLatitude("");
        setStationLongitude("");
        setStationImages("");
        setStationBank({
          accountHolderName: "",
          bankName: "",
          bsb: "",
          accountNumber: "",
          accountType: "savings",
          payoutEmail: "",
        });
        setStationTimings({
          monday: { ...defaultDayTiming },
          tuesday: { ...defaultDayTiming },
          wednesday: { ...defaultDayTiming },
          thursday: { ...defaultDayTiming },
          friday: { ...defaultDayTiming },
          saturday: { ...defaultDayTiming },
          sunday: { ...defaultDayTiming },
          is24Hours: false,
        });
        setShowStationForm(false);
        setStationCapacity(10);
        fetchStations(token);
      } else {
        const errMsg = parsed.json?.error || parsed.text || "Error creating station";
        showToast(errMsg, "error");
      }
    } catch (err) {
      console.error("Create station error:", err);
      showToast(err.message || "Server error creating station", "error");
    }
  };

  // Create partner
  const handleCreatePartner = async () => {
    const validation = validatePartnerForm();
    if (!validation.ok) {
      showToast(validation.message, "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/partner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: partnerInfo.username.trim(),
          email: partnerInfo.email.trim(),
          password: partnerInfo.password,
          phone: partnerInfo.phone.trim(),
          stationId: partnerInfo.stationId,
        }),
      });

      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        showToast("Partner created successfully!", "success");
        setPartnerInfo({
          username: "",
          password: "",
          email: "",
          phone: "",
          stationId: "",
        });
        setShowPartnerForm(false);
        fetchPartners(token);
        fetchStations(token);
      } else {
        const errMsg = parsed.json?.error || parsed.text || "Error creating partner";
        showToast(errMsg, "error");
      }
    } catch (err) {
      console.error("Create partner error:", err);
      showToast(err.message || "Server error creating partner", "error");
    }
  };

  // Prefill edit partner form
  const handleEditPartner = (partner) => {
    setEditingPartner({
      _id: partner._id,
      username: partner.username || "",
      email: partner.email || "",
      phone: partner.phone || "",
      assignedStation: partner.assignedStation?._id || "",
    });
    setPartnerFormVisibleForEdit(true);
    setActiveTab("partners");
  };

  // Update partner
  const handleUpdatePartner = async () => {
    if (!editingPartner || !editingPartner._id) return;

    const payload = {
      username: editingPartner.username?.trim(),
      email: editingPartner.email?.trim(),
      phone: editingPartner.phone?.trim(),
      assignedStation: editingPartner.assignedStation || null,
    };

    if (editingPartner.password) {
      if (editingPartner.password.length < 6) {
        showToast("Password should be at least 6 characters.", "error");
        return;
      }
      payload.password = editingPartner.password;
    }

    try {
      const res = await fetch(`/api/admin/partner/${editingPartner._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        const errMsg = parsed.json?.error || parsed.text || "Failed to update partner";
        throw new Error(errMsg);
      }

      showToast("Partner updated successfully!", "success");
      setEditingPartner(null);
      setPartnerFormVisibleForEdit(false);
      fetchPartners(token);
      fetchStations(token);
    } catch (err) {
      console.error("Update partner error:", err);
      showToast(err.message || "Error updating partner", "error");
    }
  };

  // Delete partner
  const handleDeletePartner = async (partnerId, partnerUsername) => {
    const sure = window.confirm(`Delete partner "${partnerUsername}"? This action cannot be undone.`);
    if (!sure) return;

    try {
      const res = await fetch(`/api/admin/partner/${partnerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        const errMsg = parsed.json?.error || parsed.text || "Failed to delete partner";
        throw new Error(errMsg);
      }

      showToast("Partner deleted successfully!", "success");
      fetchPartners(token);
      fetchStations(token);
    } catch (err) {
      console.error("Delete partner error:", err);
      showToast(err.message || "Error deleting partner", "error");
    }
  };

  // Save station edits
  const handleSaveStationEdits = async () => {
    if (!selectedStation?._id) return;

    const lat = editStation.latitude === "" ? null : parseFloat(editStation.latitude);
    const lon = editStation.longitude === "" ? null : parseFloat(editStation.longitude);
    if (editStation.latitude !== "" && isNaN(lat)) {
      showToast("Latitude must be a valid number.", "error");
      return;
    }
    if (editStation.longitude !== "" && isNaN(lon)) {
      showToast("Longitude must be a valid number.", "error");
      return;
    }

    if (!editStationTimings.is24Hours) {
      for (const d of daysOfWeek) {
        const dt = editStationTimings[d];
        if (!dt) {
          showToast(`Timing for ${d} is missing.`, "error");
          return;
        }
        if (!dt.closed) {
  if (!dt.open || !dt.close) {
    showToast(`Open and close times required for ${d}.`, "error");
    return;
  }
}
      }
    }

    if (!Number.isInteger(editStationCapacity) || editStationCapacity < 10 || editStationCapacity > 100) {
      showToast("Capacity must be an integer between 10 and 100.", "error");
      return;
    }

    const imagesArr = editStationImages ? editStationImages.split(",").map((i) => i.trim()).filter(Boolean) : [];

    const payload = {
      name: editStation.name?.trim(),
      location: editStation.location?.trim(),
      suburb: editStation.suburb?.trim(),
      city: editStation.city?.trim(),
      latitude: lat,
      longitude: lon,
      images: imagesArr,
      bankDetails: {
        accountHolderName: editStationBank.accountHolderName?.trim(),
        bankName: editStationBank.bankName?.trim(),
        bsb: editStationBank.bsb?.trim(),
        accountNumberEncrypted: editStationBank.accountNumber?.trim(),
        accountType: editStationBank.accountType,
        payoutEmail: editStationBank.payoutEmail?.trim() || undefined,
      },
      timings: { ...editStationTimings },
      capacity: editStationCapacity,
    };

    try {
      const res = await fetch(`/api/admin/station/${selectedStation._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        const errMsg = parsed.json?.error || parsed.text || "Failed to save station edits";
        throw new Error(errMsg);
      }

      const updated = parsed.json?.station;
      if (updated) {
        setStations((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        setSelectedStation(updated);
      }
      setShowStationEditForm(false);
      showToast("Station updated successfully!", "success");
      fetchStations(token);
    } catch (err) {
      console.error("Save station edits error:", err);
      showToast(err.message || "Error saving station edits", "error");
    }
  };

  // Delete station
  const handleDeleteStation = async () => {
    if (!selectedStation?._id) return;
    const sure = window.confirm(`Delete station "${selectedStation.name}"? This cannot be undone.`);
    if (!sure) return;

    try {
      const res = await fetch(`/api/admin/station/${selectedStation._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const parsed = await safeParseResponse(res);
      if (!parsed.ok) {
        const errMsg = parsed.json?.error || parsed.text || "Failed to delete station";
        throw new Error(errMsg);
      }

      setStations((prev) => prev.filter((s) => s._id !== selectedStation._id));
      setSelectedStation(null);
      setActiveTab("stations");
      showToast("Station deleted successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast(e.message || "Error deleting station", "error");
    }
  };

  /* ---------------------------
     Handle Refresh (new)
     - runs all fetches in parallel and reports result via toasts
     --------------------------- */
  const handleRefresh = async () => {
    if (!token) {
      showToast("No auth token - please login", "error");
      return;
    }

    showToast("Refreshing data...", "info", 2000);

    try {
      await Promise.all([fetchStations(token), fetchBookings(token), fetchKeyHandovers(token), fetchPartners(token)]);
      showToast("Data refreshed", "success", 2000);
    } catch (err) {
      console.error("Refresh failed:", err);
      showToast(err?.message || "Failed to refresh data", "error", 4000);
    }
  };

  /* ---------------------------
     UX helpers: month view, week toggles, CSV export
     --------------------------- */

  const monthsData = groupBookingsByMonth(filteredBookings);

  const toggleWeek = (weekRange) => setOpenWeeks((p) => ({ ...p, [weekRange]: !p[weekRange] }));
  const isWeekOpen = (weekRange) => !!openWeeks[weekRange];

  const scrollToWeek = (weekRange) => {
    setSelectedWeek(weekRange);
    const el = document.getElementById(`week-${sanitizeId(weekRange)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    // also open that week
    setOpenWeeks((p) => ({ ...p, [weekRange]: true }));
  };

  const sanitizeId = (str) => str.replace(/[^a-z0-9]/gi, "_");

  // Export CSV for current month
  const exportCsv = (rows, filename = "export.csv") => {
    if (!rows || rows.length === 0) {
      showToast("No data to export", "error");
      return;
    }
    // flatten rows into CSV columns we want
    const headers = ["FullName", "Email", "Phone", "DropOffDate", "PickUpDate", "LuggageCount", "Amount", "PaymentId", "Instructions"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          escapeCsv(r.fullName || ""),
          escapeCsv(r.email || ""),
          escapeCsv(r.phone || ""),
          escapeCsv(r.dropOffDate || ""),
          escapeCsv(r.pickUpDate || ""),
          r.luggageCount || 0,
          getBookingAmount(r).toFixed(2),
          escapeCsv(r.paymentId || ""),
          escapeCsv(r.specialInstructions || ""),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("CSV exported", "success");
  };

  const escapeCsv = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };

  // quick booking modal (placeholder) — replace with your real modal
  const openBookingModal = (booking) => {
    // Implement your own modal if needed — for now quick inspect
    const text = `Booking: ${booking.fullName}\nEmail: ${booking.email}\nPhone: ${booking.phone}\nDrop-off: ${booking.dropOffDate}\nPick-up: ${booking.pickUpDate}\nSmall: ${booking.smallBagCount ?? 0}
Large: ${booking.largeBagCount ?? 0}
Total: ${booking.luggageCount}
\nPayment: ${booking.paymentId}`;
    alert(text);
  };

  /* ---------------------------
     Payout handlers
     --------------------------- */

  const openPayoutModal = (partner, monthData = null) => {
    const now = new Date();
    const defaultLabel = now.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
    setPayoutModal({
      open: true, partner,
      amount: monthData ? String(monthData.earnings) : (partner.outstanding > 0 ? String(partner.outstanding) : ''),
      periodLabel: monthData ? monthData.month : defaultLabel,
      notes: '', loading: false,
    });
  };

  const handleMarkAsPaid = async () => {
    const { partner, amount, periodLabel, notes } = payoutModal;
    if (!amount || !periodLabel.trim()) {
      showToast('Amount and period label are required', 'error');
      return;
    }
    setPayoutModal(prev => ({ ...prev, loading: true }));
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const pendingBonusIds = partner.pendingBonuses?.map(b => b._id) || [];
      const res = await fetch('/api/admin/partner-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          partnerId: partner.partnerId,
          stationId: partner.stationId,
          amount: parseFloat(amount),
          periodLabel: periodLabel.trim(),
          periodStart: monthStart,
          periodEnd: monthEnd,
          bookingEarnings: partner.earningsThisMonth,
          bonusEarnings: partner.pendingBonusTotal,
          bonusIds: pendingBonusIds,
          notes,
        }),
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) throw new Error(parsed.json?.error || 'Payout failed');
      showToast('Payout recorded!', 'success');
      setPayoutModal({ open: false, partner: null, amount: '', periodLabel: '', notes: '', loading: false });
      // Reload summaries to reflect new paid amounts
      setPayoutTabLoaded(false);
      fetchPayoutSummaries(token);
    } catch (err) {
      setPayoutModal(prev => ({ ...prev, loading: false }));
      showToast(err.message, 'error');
    }
  };

  const handleCreateOffer = async () => {
    if (!newOffer.name.trim()) { showToast('Name is required', 'error'); return; }
    if (!newOffer.threshold || +newOffer.threshold < 1) { showToast('Threshold must be at least 1', 'error'); return; }
    if (!newOffer.rewardAmount || +newOffer.rewardAmount <= 0) { showToast('Reward amount must be positive', 'error'); return; }
    if (newOffer.type === 'rolling_window' && (!newOffer.windowDays || +newOffer.windowDays < 1)) {
      showToast('Window days is required for rolling window', 'error'); return;
    }
    setNewOffer(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/admin/bonus-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newOffer.name.trim(),
          description: newOffer.description.trim(),
          type: newOffer.type,
          threshold: +newOffer.threshold,
          windowDays: newOffer.type === 'rolling_window' ? +newOffer.windowDays : undefined,
          rewardAmount: +newOffer.rewardAmount,
        }),
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) throw new Error(parsed.json?.error || 'Failed to create offer');
      showToast('Bonus offer created!', 'success');
      setNewOffer({ show: false, name: '', description: '', type: 'rolling_window', threshold: '', windowDays: '', rewardAmount: '', loading: false });
      fetchBonusOffers(token);
      // Re-fetch summaries so progress bars update
      setPayoutTabLoaded(false);
      fetchPayoutSummaries(token);
    } catch (err) {
      setNewOffer(prev => ({ ...prev, loading: false }));
      showToast(err.message, 'error');
    }
  };

  const handleToggleOffer = async (offerId, currentActive) => {
    try {
      const res = await fetch(`/api/admin/bonus-offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !currentActive }),
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) throw new Error(parsed.json?.error || 'Failed to update');
      setBonusOffers(prev => prev.map(o => o._id === offerId ? { ...o, active: !currentActive } : o));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteOffer = async (offerId, offerName) => {
    if (!confirm(`Delete bonus offer "${offerName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/bonus-offers/${offerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await safeParseResponse(res);
      if (!parsed.ok) throw new Error(parsed.json?.error || 'Failed to delete');
      setBonusOffers(prev => prev.filter(o => o._id !== offerId));
      showToast('Offer deleted', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ---------------------------
     Overview chart data
     --------------------------- */

  // KPI: this month vs last month
  const overviewKPIs = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const thisMonthBk = allBookings.filter(b => new Date(b.dropOffDate) >= thisMonthStart);
    const lastMonthBk = allBookings.filter(b => {
      const d = new Date(b.dropOffDate);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });

    const thisRevenue  = calculateTotalAmount(thisMonthBk);
    const lastRevenue  = calculateTotalAmount(lastMonthBk);

    // Compare daily averages so a partial current month isn't unfairly negative
    const daysElapsed   = now.getDate(); // days into current month so far
    const daysLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const thisAvgPerDay = daysElapsed > 0 ? thisRevenue / daysElapsed : 0;
    const lastAvgPerDay = daysLastMonth > 0 ? lastRevenue / daysLastMonth : 0;
    const revenueChange = lastAvgPerDay > 0
      ? +((thisAvgPerDay - lastAvgPerDay) / lastAvgPerDay * 100).toFixed(1)
      : null;

    const activeNow       = allBookings.filter(b => b.status === "stored").length;
    const cancelledCount  = allBookings.filter(b => b.status === "cancelled" || b.status === "no_show").length;
    const cancelRate      = allBookings.length > 0
      ? +((cancelledCount / allBookings.length) * 100).toFixed(1)
      : 0;
    const thisPayable     = calculateTotalPartnerShare(thisMonthBk);

    return { thisRevenue, lastRevenue, revenueChange, activeNow, cancelRate, thisPayable };
  }, [allBookings]);

  // 6-month revenue + bookings trend
  const sixMonthData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const bks   = allBookings.filter(b => {
        const drop = new Date(b.dropOffDate);
        return drop >= start && drop <= end;
      });
      return {
        month: d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }),
        Revenue: parseFloat(calculateTotalAmount(bks).toFixed(2)),
        Bookings: bks.length,
      };
    });
  }, [allBookings]);

  // Station comparison
  const stationCompareData = useMemo(() => {
    return stations.map(s => {
      const bks = allBookings.filter(b => b.stationId?._id === s._id);
      // Shorten long names for the chart axis
      const shortName = s.name
        .replace(/\s*[-–]\s*luggage\s+(terminal|storage)/gi, "")
        .replace(/luggage\s+(terminal|storage)/gi, "")
        .replace(/ezymart\s*/i, "")
        .replace(/\bstation\b/i, "Stn")
        .trim()
        .slice(0, 18) || s.name.slice(0, 18);
      return {
        name: shortName,
        Revenue: parseFloat(calculateTotalAmount(bks).toFixed(2)),
        Payable: parseFloat(calculateTotalPartnerShare(bks).toFixed(2)),
        Bookings: bks.length,
      };
    });
  }, [stations, allBookings]);

  /* ---------------------------
     Render UI
     --------------------------- */

  // compute station totals for selected station view (admin needs to see station revenue and payable)
  const stationTotal = calculateTotalAmount(filteredBookings || []);
  const stationPayable = calculateTotalPartnerShare(filteredBookings || []);

  if (userRole !== "admin") return <div className={styles.loading}>Loading...</div>;

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <div className={styles.userInfo}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className={styles.userAvatar}>A</div>
              <span className={styles.userName}>Admin</span>
            </div>

            {/* Refresh button */}
            <div style={{ marginLeft: 12 }}>
              <button className={styles.smallButton} onClick={handleRefresh} title="Refresh data">
                ⟳ Refresh
              </button>
            </div>
          </div>
        </div>

        <div className={styles.tabContainer}>
          <button
            className={`${styles.tab} ${activeTab === "overview" ? styles.tabActive : ""}`}
            onClick={() => {
              setActiveTab("overview");
              setSelectedStation(null);
            }}
          >
            📊 Over view
          </button>
          <button
            className={`${styles.tab} ${activeTab === "stations" ? styles.tabActive : ""}`}
            onClick={() => {
              setActiveTab("stations");
              setSelectedStation(null);
            }}
          >
            📍 Stations
          </button>
          <button className={`${styles.tab} ${activeTab === "partners" ? styles.tabActive : ""}`} onClick={() => setActiveTab("partners")}>
            🤝 Partners
          </button>
          <button className={`${styles.tab} ${activeTab === "payouts" ? styles.tabActive : ""}`} onClick={() => setActiveTab("payouts")}>
            💳 Payouts
          </button>
        </div>

        <div className={styles.content}>
          {/* Overview */}
          {activeTab === "overview" && (
            <div>
              {/* ── KPI Cards ── */}
              <div className={styles.overviewGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📍</div>
                  <div>
                    <div className={styles.statValue}>{stations.length}</div>
                    <div className={styles.statLabel}>Total Stations</div>
                  </div>
                </div>

                <div
                  className={styles.statCard}
                  onClick={() => { setBookingsPanel(p => p === 'all' ? null : 'all'); setBookingSearch(''); }}
                  style={{ cursor: 'pointer', border: bookingsPanel === 'all' ? '2px solid #0284C7' : undefined }}
                  title="Click to view all bookings"
                >
                  <div className={styles.statIcon}>📦</div>
                  <div>
                    <div className={styles.statValue}>{allBookings.length}</div>
                    <div className={styles.statLabel}>Total Bookings</div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>🧳</div>
                  <div>
                    <div className={styles.statValue}>{overviewKPIs.activeNow}</div>
                    <div className={styles.statLabel}>Bags Stored Now</div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>💰</div>
                  <div>
                    <div className={styles.statValue}>
                      A${allBookings.reduce((sum, b) => sum + getBookingAmount(b), 0).toFixed(2)}
                    </div>
                    <div className={styles.statLabel}>All-time Revenue</div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📅</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div className={styles.statValue}>A${overviewKPIs.thisRevenue.toFixed(2)}</div>
                      {overviewKPIs.revenueChange !== null && (
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                          background: overviewKPIs.revenueChange >= 0 ? "#dcfce7" : "#fee2e2",
                          color: overviewKPIs.revenueChange >= 0 ? "#16a34a" : "#dc2626",
                        }}>
                          {overviewKPIs.revenueChange >= 0 ? "▲" : "▼"} {Math.abs(overviewKPIs.revenueChange)}%
                        </span>
                      )}
                    </div>
                    <div className={styles.statLabel}>
                      This Month · vs last month avg/day
                    </div>
                  </div>
                </div>

                <div
                  className={styles.statCard}
                  onClick={() => { setBookingsPanel(p => p === 'cancelled' ? null : 'cancelled'); setBookingSearch(''); }}
                  style={{ cursor: 'pointer', border: bookingsPanel === 'cancelled' ? '2px solid #dc2626' : undefined }}
                  title="Click to view cancelled bookings"
                >
                  <div className={styles.statIcon}>❌</div>
                  <div>
                    <div className={styles.statValue}>{overviewKPIs.cancelRate}%</div>
                    <div className={styles.statLabel}>Cancellation Rate</div>
                  </div>
                </div>
              </div>

              {/* ── Refund Requests panel ── */}
              {(refundRequests.length > 0 || refundRequestsLoading) && (
                <div style={{ marginBottom: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #fde68a', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #fef3c7', background: '#fffbeb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>💰</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#92400e' }}>
                        Refund Requests
                        {refundRequests.length > 0 && (
                          <span style={{ marginLeft: 8, background: '#dc2626', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                            {refundRequests.length}
                          </span>
                        )}
                      </span>
                    </div>
                    <button onClick={() => fetchRefundRequests(token)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#92400e' }}>⟳</button>
                  </div>
                  {refundRequestsLoading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</div>
                  ) : refundRequests.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No pending requests.</div>
                  ) : (
                    <div>
                      {refundRequests.map((r, i) => {
                        const b = r.bookingId;
                        return (
                          <div key={r._id} style={{ padding: '14px 16px', borderBottom: i < refundRequests.length - 1 ? '1px solid #fef3c7' : 'none', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{b?.fullName}</div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{b?.email}</div>
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{b?.bookingReference}</code>
                                {' · '}
                                <span style={{ textTransform: 'capitalize', fontWeight: 600, color: r.type === 'cancel' ? '#dc2626' : '#0284C7' }}>{r.type === 'cancel' ? 'Cancel' : 'Shorten Stay'}</span>
                              </div>
                              {r.type === 'reduce' && (
                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                                  New: {formatSimpleDate(r.requestedDropOff)} → {formatSimpleDate(r.requestedPickUp)}
                                </div>
                              )}
                              {r.customerNote && (
                                <div style={{ fontSize: 12, color: '#374151', marginTop: 4, fontStyle: 'italic' }}>&quot;{r.customerNote}&quot;</div>
                              )}
                            </div>
                            <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: 16, color: '#15803d' }}>A${Number(r.refundAmount).toFixed(2)}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                {fmtDT(r.createdAt)}
                              </div>
                              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleApproveRefund(r)}
                                  style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                                >
                                  ✅ Approve
                                </button>
                                <button
                                  onClick={() => setRejectModal({ open: true, request: r, reason: '', loading: false })}
                                  style={{ padding: '6px 14px', background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Inline bookings panel ── */}
              {bookingsPanel && (() => {
                const panelBookings = bookingsPanel === 'cancelled'
                  ? allBookings.filter(b => b.status === 'cancelled' || b.status === 'no_show')
                  : allBookings;

                const q = bookingSearch.trim().toLowerCase();
                const filtered = (q
                  ? panelBookings.filter(b => {
                      const name = (b.fullName || '').toLowerCase();
                      const email = (b.email || '').toLowerCase();
                      const drop = formatSimpleDate(b.dropOffDate).toLowerCase();
                      const ref = (b.bookingReference || '').toLowerCase();
                      return name.includes(q) || email.includes(q) || drop.includes(q) || ref.includes(q);
                    })
                  : panelBookings
                ).slice().sort((a, b) => {
                  const aVal = bookingSort === 'bookedAt'
                    ? new Date(a.createdAt || a._id.toString().substring(0,8))
                    : new Date(a.dropOffDate);
                  const bVal = bookingSort === 'bookedAt'
                    ? new Date(b.createdAt || b._id.toString().substring(0,8))
                    : new Date(b.dropOffDate);
                  return bVal - aVal;
                });

                const accentColor = bookingsPanel === 'cancelled' ? '#dc2626' : '#0284C7';
                const title = bookingsPanel === 'cancelled'
                  ? `Cancelled Bookings (${filtered.length})`
                  : `All Bookings (${filtered.length})`;

                return (
                  <div style={{ marginTop: 20, background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: `1px solid ${accentColor}22`, overflow: 'hidden' }}>
                    {/* Panel header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: accentColor }}>{title}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 200px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Sort toggle */}
                        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #d1d5db', overflow: 'hidden', fontSize: 12, flexShrink: 0 }}>
                          <button
                            onClick={() => setBookingSort('dropOff')}
                            style={{ padding: '6px 11px', border: 'none', cursor: 'pointer', fontWeight: bookingSort === 'dropOff' ? 700 : 400, background: bookingSort === 'dropOff' ? '#0284C7' : '#fff', color: bookingSort === 'dropOff' ? '#fff' : '#374151', transition: 'all 0.15s' }}
                          >Drop-off</button>
                          <button
                            onClick={() => setBookingSort('bookedAt')}
                            style={{ padding: '6px 11px', border: 'none', borderLeft: '1px solid #d1d5db', cursor: 'pointer', fontWeight: bookingSort === 'bookedAt' ? 700 : 400, background: bookingSort === 'bookedAt' ? '#0284C7' : '#fff', color: bookingSort === 'bookedAt' ? '#fff' : '#374151', transition: 'all 0.15s' }}
                          >Booked At</button>
                        </div>
                        <input
                          type="text"
                          placeholder="Search name, email, date, ref…"
                          value={bookingSearch}
                          onChange={e => setBookingSearch(e.target.value)}
                          style={{ flex: '1 1 180px', maxWidth: 280, borderRadius: 8, border: '1px solid #d1d5db', padding: '7px 12px', fontSize: 16 }}
                          autoFocus
                        />
                        <button
                          onClick={() => { setBookingsPanel(null); setBookingSearch(''); }}
                          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: '4px 6px' }}
                        >✕</button>
                      </div>
                    </div>

                    {/* Bookings list */}
                    <div style={{ maxHeight: 520, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filtered.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No bookings found.</div>
                      ) : (
                        filtered.map((b) => {
                          const stationName = stations.find(s => s._id === (b.stationId?._id || b.stationId))?.name || b.stationId?.name || '—';
                          const shortStation = stationName.replace(/\s*[-–]\s*luggage\s+(terminal|storage)/gi, '').replace(/luggage\s+(terminal|storage)/gi, '').trim();
                          const statusColors = {
                            confirmed: { bg: '#dbeafe', color: '#1d4ed8' },
                            stored:    { bg: '#dcfce7', color: '#15803d' },
                            completed: { bg: '#f3f4f6', color: '#374151' },
                            cancelled: { bg: '#fee2e2', color: '#dc2626' },
                            no_show:   { bg: '#fef3c7', color: '#92400e' },
                          };
                          const sc = statusColors[b.status] || { bg: '#f3f4f6', color: '#6b7280' };
                          return (
                            <div key={b._id} style={{
                              background: '#fff',
                              border: '1px solid #f0f0f0',
                              borderRadius: 10,
                              padding: '12px 14px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}>
                              {/* Row 1: name + status + amount */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                <div>
                                  <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{b.fullName}</span>
                                  <span style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{b.bookingReference}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>A${getBookingAmount(b).toFixed(2)}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 9px', background: sc.bg, color: sc.color }}>
                                    {b.status}
                                  </span>
                                </div>
                              </div>
                              {/* Row 2: station · date · bags */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: '#6b7280' }}>
                                <span>📍 {shortStation}</span>
                                <span>📅 {formatSimpleDate(b.dropOffDate)}</span>
                                <span>🧳 {b.smallBagCount ?? 0}S · {b.largeBagCount ?? 0}L</span>
                                <span style={{ color: '#9ca3af' }}>{b.email}</span>
                              </div>
                              {b.cancellationReason && (
                                <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', background: '#fee2e2', borderRadius: 6, padding: '4px 8px' }}>
                                  Reason: {b.cancellationReason}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── Charts ── */}
              <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>

                {/* 6-month revenue trend */}
                <div style={{
                  flex: 2, minWidth: "min(300px, 100%)",
                  background: "#fff", borderRadius: 12,
                  padding: "20px 16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#111" }}>
                    Revenue — Last 6 Months
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sixMonthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} width={52} />
                      <Tooltip
                        formatter={(val, name) => [`A$${val}`, name]}
                        contentStyle={{ borderRadius: 8, fontSize: 13 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Revenue" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Bookings count sparkline */}
                  <div style={{ fontWeight: 700, fontSize: 15, margin: "20px 0 16px", color: "#111" }}>
                    Bookings — Last 6 Months
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={sixMonthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={36} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                      <Line
                        type="monotone" dataKey="Bookings"
                        stroke="#F59E0B" strokeWidth={2}
                        dot={{ r: 4, fill: "#F59E0B" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Station comparison */}
                <div style={{
                  flex: 1, minWidth: "min(260px, 100%)",
                  background: "#fff", borderRadius: 12,
                  padding: "20px 16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#111" }}>
                    Station Comparison
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={stationCompareData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip
                        formatter={(val, name) => [`A$${val}`, name]}
                        contentStyle={{ borderRadius: 8, fontSize: 13 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Revenue" fill="#0284C7" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Payable" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Per-station booking counts */}
                  <div style={{ marginTop: 20 }}>
                    {stationCompareData.map(s => (
                      <div key={s.name} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "6px 0",
                        borderBottom: "1px solid #f3f4f6", fontSize: 13,
                      }}>
                        <span style={{ color: "#374151" }}>{s.name}</span>
                        <span style={{ fontWeight: 600, color: "#111" }}>{s.Bookings} bookings</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Stations list */}
          {activeTab === "stations" && !selectedStation && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Manage Stations</h2>
                <button className={styles.addButton} onClick={() => setShowStationForm(!showStationForm)}>
                  {showStationForm ? "✕ Cancel" : "+ Add Station"}
                </button>
              </div>

              {showStationForm && (
                <div className={styles.formCard}>
                  <h3 className={styles.formTitle}>Create New Station</h3>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>📍 Basic Information</h4>
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={stationName} onChange={(e) => setStationName(e.target.value)} placeholder="Station Name" />
                      <input className={styles.input} value={stationLocation} onChange={(e) => setStationLocation(e.target.value)} placeholder="Station Location" />
                      <input className={styles.input} value={stationSuburb} onChange={(e) => setStationSuburb(e.target.value)} placeholder="Suburb (e.g. CBD, Southbank, Fitzroy)" />
                      <input className={styles.input} value={stationCity} onChange={(e) => setStationCity(e.target.value)} placeholder="City (e.g. Melbourne)" />
                      <input className={styles.input} value={stationLatitude} onChange={(e) => setStationLatitude(e.target.value)} placeholder="Latitude (e.g., -33.86)" />
                      <input className={styles.input} value={stationLongitude} onChange={(e) => setStationLongitude(e.target.value)} placeholder="Longitude (e.g., 151.20)" />
                      <input className={styles.input} value={stationImages} onChange={(e) => setStationImages(e.target.value)} placeholder="Station images (optional) — comma separated URLs" />
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>📦 Capacity Settings</h4>
                    <div className={styles.formGrid}>
                      <div className={styles.capacityInputGroup}>
                        <label htmlFor="stationCapacity" className={styles.label}>
                          Maximum Luggage Capacity
                        </label>
                        <div className={styles.capacityControls}>
                          <button type="button" onClick={() => setStationCapacity((prev) => Math.max(10, prev - 10))} className={styles.capacityBtn}>
                            −
                          </button>
                          <input
                            type="number"
                            id="stationCapacity"
                            value={stationCapacity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 10;
                              setStationCapacity(Math.min(100, Math.max(10, val)));
                            }}
                            min="10"
                            max="100"
                            className={styles.capacityInput}
                          />
                          <button type="button" onClick={() => setStationCapacity((prev) => Math.min(100, prev + 10))} className={styles.capacityBtn}>
                            +
                          </button>
                        </div>
                        <p className={styles.capacityHint}>Set maximum luggage capacity (10-100 bags). System will block bookings at 90% capacity.</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>🏦 Bank / Payout Details</h4>
                    <div className={styles.formGrid}>
                      <input className={`${styles.input} ${styles.fullWidth}`} value={stationBank.accountHolderName} onChange={(e) => handleStationBankChange("accountHolderName", e.target.value)} placeholder="Account Holder Name" />
                      <input className={`${styles.input} ${styles.fullWidth}`} value={stationBank.bankName} onChange={(e) => handleStationBankChange("bankName", e.target.value)} placeholder="Bank Name" />
                      <input className={styles.input} value={stationBank.bsb} onChange={(e) => handleStationBankChange("bsb", e.target.value)} placeholder="BSB (e.g., 062000)" maxLength={6} />
                      <input className={styles.input} value={stationBank.accountNumber} onChange={(e) => handleStationBankChange("accountNumber", e.target.value)} placeholder="Account Number" />
                      <input className={`${styles.input} ${styles.fullWidth}`} value={stationBank.payoutEmail} onChange={(e) => handleStationBankChange("payoutEmail", e.target.value)} placeholder="Payout Email (PayPal/Wise) — optional" />
                      <select className={`${styles.input} ${styles.fullWidth}`} value={stationBank.accountType} onChange={(e) => handleStationBankChange("accountType", e.target.value)}>
                        <option value="savings">Savings Account</option>
                        <option value="checking">Checking Account</option>
                        <option value="business">Business Account</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>⏰ Store Operating Hours</h4>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" checked={stationTimings.is24Hours} onChange={handleStation24Toggle} className={styles.checkbox} />
                      Open 24 Hours
                    </label>

                    {!stationTimings.is24Hours && (
                      <div className={styles.timingsContainer}>
                        {daysOfWeek.map((day) => (
                          <div key={day} className={styles.dayTiming}>
                            <div className={styles.dayHeader}>
                              <strong className={styles.dayName}>{day.charAt(0).toUpperCase() + day.slice(1)}</strong>
                              <button type="button" className={styles.applyAllButton} onClick={() => applyStationTimingToAllDays(day)}>
                                Apply to All
                              </button>
                            </div>
                            <label className={styles.checkboxLabel}>
                              <input type="checkbox" checked={stationTimings[day].closed} onChange={(e) => handleStationTimingChange(day, "closed", e.target.checked)} className={styles.checkbox} />
                              Closed
                            </label>
                            {!stationTimings[day].closed && (
                              <div className={styles.timeInputs}>
                                <div className={styles.timeGroup}>
                                  <label className={styles.timeLabel}>Open:</label>
                                  <input type="time" className={styles.timeInput} value={stationTimings[day].open} onChange={(e) => handleStationTimingChange(day, "open", e.target.value)} />
                                </div>
                                <div className={styles.timeGroup}>
                                  <label className={styles.timeLabel}>Close:</label>
                                  <input type="time" className={styles.timeInput} value={stationTimings[day].close} onChange={(e) => handleStationTimingChange(day, "close", e.target.value)} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className={styles.submitButton} onClick={handleCreateStation} disabled={!isStationFormValid()} title={!isStationFormValid() ? validateStationForm().message : "Create station"}>
                    Create Station
                  </button>
                </div>
              )}

              <div className={styles.stationsGrid}>
                {stations.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📍</div>
                    <p className={styles.emptyText}>No stations yet. Create your first station!</p>
                  </div>
                ) : (
                  stations.map((station) => (
                    <div key={station._id} className={styles.stationCard} onClick={() => { setSelectedStation(station); setActiveTab("stations"); }}>
                      <h3 className={styles.stationName}>{station.name}</h3>
                      <p className={styles.stationLocation}>{station.location}</p>
                      <div className={styles.stationStats}>
                        <span className={styles.statBadge}>📦 {allBookings.filter((b) => b.stationId?._id === station._id).length}</span>
                        <span className={styles.statBadge}>🔑 {allKeyHandovers.filter((k) => k.stationId?._id === station._id).length}</span>
                        <span className={styles.statBadge}>⚖️ {station.capacity ?? "—"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Station detail */}
          {activeTab === "stations" && selectedStation && (
            <div>
              <button className={styles.backButton} onClick={() => setSelectedStation(null)}>
                ← Back to Stations
              </button>
              <div className={styles.stationSection}>
                <div className={styles.stationDetailHeader}>
                  <h2 className={styles.stationDetailTitle}>{selectedStation.name}</h2>
                  <p className={styles.stationDetailLocation}>{selectedStation.location}</p>
                </div>

                {/* NEW: Station-level KPIs showing revenue and payable to partner */}
                <div style={{ display: "flex", gap: 12, marginTop: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div className={styles.monthPill}>{filteredBookings.length} bookings</div>
                  <div className={styles.monthPill}>Station revenue A${stationTotal.toFixed(2)}</div>
                  <div className={styles.monthPill} style={{ background: "rgba(0,0,0,0.03)" }}>
                    Owed to partner: A${stationPayable.toFixed(2)}
                  </div>
                </div>
              </div>
              {/* Bookings/Keys toggles & lists */}
              <div className={styles.toggleContainer}>
                <button className={`${styles.toggleButton} ${activeView === "bookings" ? styles.toggleActive : ""}`} onClick={() => setActiveView("bookings")}>
                  📦 Bookings ({filteredBookings.length})
                </button>
                <button className={`${styles.toggleButton} ${activeView === "keys" ? styles.toggleActive : ""}`} onClick={() => setActiveView("keys")}>
                  🔑 Key Handovers ({filteredKeyHandovers.length})
                </button>
              </div>

              {activeView === "bookings" && (
                <div>
                  {loadingBookings ? (
                    <div className={styles.emptyState}>
                      <p>Loading bookings...</p>
                    </div>
                  ) : bookingError ? (
                    <div className={styles.error}>{bookingError}</div>
                  ) : filteredBookings.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>📦</div>
                      <p className={styles.emptyText}>No bookings for this station</p>
                    </div>
                  ) : (
                    // Months-first UX
                    <div>
                      {/* If no month is expanded -> show month cards */}
                      {!expandedMonth ? (
                        <div className={styles.monthGrid}>
                          {monthsData.map(([month, weeks]) => {
                            const monthBookings = weeks.flatMap(([, weekData]) => weekData.bookings);
                            const monthTotal = calculateTotalAmount(monthBookings);
                            return (
                              <div key={month} className={styles.monthCard} role="button" tabIndex={0} onClick={() => setExpandedMonth(month)} onKeyDown={(e) => { if (e.key === 'Enter') setExpandedMonth(month); }}>
                                <div className={styles.monthCardIcon}>📅</div>
                                <div className={styles.monthCardContent}>
                                  <div className={styles.monthCardTitle}>{month}</div>
                                  <div className={styles.monthCardStats}>
                                    <div className={styles.monthPill}>{monthBookings.length} bookings</div>
                                    <div className={styles.monthPill}>A${monthTotal.toFixed(2)}</div>

                                    {/* Partner payable (flat rate) */}
                                    <div className={styles.monthPill}>
                                      Payable: A${calculateTotalPartnerShare(monthBookings).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Expanded month -> show weeks for that month
                        (() => {
                          const found = monthsData.find(([m]) => m === expandedMonth);
                          if (!found) return <div className={styles.emptyState}><p>Month not found.</p></div>;
                          const [, weeks] = found;
                          const monthBookings = weeks.flatMap(([, weekData]) => weekData.bookings);
                          const monthTotal = calculateTotalAmount(monthBookings);

                          return (
                            <div className={styles.monthPanel}>
                              <div className={styles.monthPanelHeader}>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                  <button className={styles.backButton} onClick={() => setExpandedMonth(null)}>
                                    ← Back to months
                                  </button>
                                  <strong>{expandedMonth}</strong>
                                </div>

                                <div className={styles.monthKPIs}>
                                  <div className={styles.monthPill}>{monthBookings.length} bookings</div>
                                  <div className={styles.monthPill}>A${monthTotal.toFixed(2)}</div>

                                  {/* Partner payable (flat rate: $2/small/day, $4/large/day) */}
                                  <div className={styles.monthPill}>
                                    Partner payable: A${calculateTotalPartnerShare(monthBookings).toFixed(2)}
                                  </div>

                                  <button
                                    className={styles.smallButton}
                                    onClick={() => exportCsv(monthBookings, `${expandedMonth.replace(/\s+/g, "_")}_bookings.csv`)}
                                  >
                                    Export CSV
                                  </button>

                                  <button
                                    className={styles.smallButton}
                                    onClick={() => setCompactView((p) => !p)}
                                    title="Toggle compact / detailed view"
                                  >
                                    {compactView ? "Detailed" : "Compact"}
                                  </button>
                                </div>
                              </div>

                              {/* week strip */}
                              <div className={styles.weekStrip} aria-hidden>
                                {weeks.map(([weekRange]) => (
                                  <button
                                    key={weekRange}
                                    className={`${styles.weekBtn} ${selectedWeek === weekRange ? styles.weekBtnActive : ""}`}
                                    onClick={() => scrollToWeek(weekRange)}
                                  >
                                    {weekRange}
                                  </button>
                                ))}
                              </div>

                              {/* week accordions */}
                              <div>
                                {weeks.map(([weekRange, weekData]) => {
                                  const weekTotal = calculateTotalAmount(weekData.bookings);
                                  return (
                                    <section
                                      id={`week-${sanitizeId(weekRange)}`}
                                      key={weekRange}
                                      className={styles.weekSectionAccordion}
                                      aria-labelledby={`header-${sanitizeId(weekRange)}`}
                                    >
                                      <header
                                        id={`header-${sanitizeId(weekRange)}`}
                                        className={styles.weekAccordionHeader}
                                        role="button"
                                        aria-expanded={isWeekOpen(weekRange)}
                                        tabIndex={0}
                                        onClick={() => toggleWeek(weekRange)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') toggleWeek(weekRange); }}
                                      >
                                        <div>{weekRange}</div>
                                        <div style={{ color: "var(--color-text-primary)", fontWeight: 800 }}>
                                          {weekData.bookings.length} • A${weekTotal.toFixed(2)} • Payable A${calculateTotalPartnerShare(weekData.bookings).toFixed(2)}
                                        </div>
                                      </header>

                                      {/* animated accordion body */}
                                      <div
                                        className={styles.weekAccordionBody}
                                        style={{
                                          maxHeight: isWeekOpen(weekRange) ? 4000 : 0,
                                          transition: "max-height 360ms ease",
                                          overflow: "hidden",
                                          padding: isWeekOpen(weekRange) ? undefined : 0,
                                        }}
                                      >
                                        {weekData.bookings.map((booking) => {
                                          const bookingAmount = getBookingAmount(booking);
                                          return (
                                            <div key={booking._id} className={styles.bookingRow}>
                                              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                                                <div style={{ minWidth: 0 }}>
                                                  <div className={styles.bookingName}>{booking.fullName}</div>
                                                  {!compactView && (
                                                    <div className={styles.bookingMeta}>
                                                      <span>{booking.email || "-"}</span> • <span>{booking.phone || "-"}</span>
                                                    </div>
                                                  )}
                                                  <div className={styles.bookingMeta}>
                                                    {booking.smallBagCount ?? 0} small • {booking.largeBagCount ?? 0} large
{formatSimpleDate(booking.dropOffDate)} → {formatSimpleDate(booking.pickUpDate)}
                                                  </div>
                                                </div>
                                              </div>

                                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                  <div className={styles.badge}>A${bookingAmount.toFixed(2)}</div>

                                                  {/* small payable label */}
                                                  <div className={styles.payableMini}>
                                                    Payable A${getBookingPartnerShare(booking).toFixed(2)}
                                                  </div>
                                                </div>

                                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                  <button className={styles.smallButton} onClick={() => openBookingModal(booking)}>
                                                    View
                                                  </button>
                                                  {(booking.status === "pending" || booking.status === "confirmed") && (
                                                    <button
                                                      className={styles.smallButton}
                                                      style={{ background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}
                                                      onClick={() => openRescheduleModal(booking)}
                                                    >
                                                      Reschedule
                                                    </button>
                                                  )}
                                                  {booking.pendingRefundAmount > 0 && (
                                                    <button
                                                      className={styles.smallButton}
                                                      style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d", fontWeight: 700 }}
                                                      onClick={() => handlePartialRefund(booking, booking.pendingRefundAmount)}
                                                    >
                                                      Refund A${Number(booking.pendingRefundAmount).toFixed(2)} owed
                                                    </button>
                                                  )}
                                                  {booking.status !== "cancelled" && booking.status !== "no_show" && (
                                                    <button
                                                      className={styles.smallButton}
                                                      style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" }}
                                                      onClick={() => openCancelModal(booking)}
                                                    >
                                                      Cancel
                                                    </button>
                                                  )}
                                                  {booking.status === "cancelled" && (
                                                    <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, alignSelf: "center" }}>Cancelled</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                        {weekData.bookings.length === 0 && <div className={styles.emptyState}>No bookings this week</div>}
                                      </div>
                                    </section>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeView === "keys" && (
                <div>
                  {loadingKeys ? (
                    <div className={styles.emptyState}>
                      <p>Loading key handovers...</p>
                    </div>
                  ) : keyError ? (
                    <div className={styles.error}>{keyError}</div>
                  ) : filteredKeyHandovers.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>🔑</div>
                      <p className={styles.emptyText}>No key handovers for this station</p>
                    </div>
                  ) : (
                    <div className={styles.monthlyContainer}>
                      {groupKeyHandoversByMonth(filteredKeyHandovers).map(([month, weeks]) => (
                        <div key={month} className={styles.monthSection}>
                          <div className={styles.monthHeader}>
                            <span>{month}</span>
                            <span>{weeks.reduce((total, [, weekData]) => total + weekData.handovers.length, 0)} handovers</span>
                          </div>
                          {weeks.map(([weekRange, weekData]) => (
                            <div key={weekRange}>
                              <div className={styles.weekHeader}>
                                <span>{weekRange}</span>
                                <span>{weekData.handovers.length} handovers</span>
                              </div>
                              <div className={styles.listContainer}>
                                {weekData.handovers.map((handover) => (
                                  <div key={handover._id} className={styles.listCard}>
                                    <div className={styles.listCardHeader}>
                                      <strong>{handover.dropOffPerson?.name}</strong>
                                      <span className={styles.amount}>A${handover.price?.toFixed(2)}</span>
                                    </div>
                                    <div className={styles.listCardBody}>
                                      <p>
                                        <strong>Drop-off:</strong> {handover.dropOffPerson?.name} ({handover.dropOffPerson?.email || "no email"})
                                      </p>
                                      <p>
                                        <strong>Pick-up:</strong> {handover.pickUpPerson?.name} ({handover.pickUpPerson?.email || "no email"})
                                      </p>
                                      <p>
                                        <strong>Drop-off Date:</strong> {handover.dropOffDate}
                                      </p>
                                      <p>
                                        <strong>Pick-up Date:</strong> {handover.pickUpDate}
                                      </p>
                                      <p>
                                        <strong>Pickup Code:</strong> <code className={styles.code}>{handover.keyCode}</code>
                                      </p>
                                      <p>
                                        <strong>Payment ID:</strong> {handover.paymentId}
                                      </p>
                                      <p>
                                        <strong>Status:</strong> <span className={styles.statusBadge}>{handover.status}</span>
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Edit & Delete */}
              <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
                <button
                  className={styles.updateButton}
                  onClick={() => {
                    setShowStationEditForm(true);
                    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                  }}
                >
                  ✎ Edit
                </button>
                <button className={styles.deleteButton} onClick={handleDeleteStation}>
                  🗑 Delete
                </button>
              </div>

              {/* Station EDIT form */}
              {showStationEditForm && (
                <div className={styles.formCard} style={{ marginTop: 20 }}>
                  <h3 className={styles.formTitle}>Edit Station — {selectedStation.name}</h3>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>📍 Basic Information</h4>
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={editStation.name} onChange={(e) => setEditStation((s) => ({ ...s, name: e.target.value }))} placeholder="Station Name" />
                      <input className={styles.input} value={editStation.location} onChange={(e) => setEditStation((s) => ({ ...s, location: e.target.value }))} placeholder="Station Location" />
                      <input className={styles.input} value={editStation.suburb} onChange={(e) => setEditStation((s) => ({ ...s, suburb: e.target.value }))} placeholder="Suburb (e.g. CBD, Southbank, Fitzroy)" />
                      <input className={styles.input} value={editStation.city} onChange={(e) => setEditStation((s) => ({ ...s, city: e.target.value }))} placeholder="City (e.g. Melbourne)" />
                      <input className={styles.input} value={editStation.latitude} onChange={(e) => setEditStation((s) => ({ ...s, latitude: e.target.value }))} placeholder="Latitude (e.g., -33.86)" />
                      <input className={styles.input} value={editStation.longitude} onChange={(e) => setEditStation((s) => ({ ...s, longitude: e.target.value }))} placeholder="Longitude (e.g., 151.20)" />
                      <input className={styles.input} value={editStationImages} onChange={(e) => setEditStationImages(e.target.value)} placeholder="Station images (optional) — comma separated URLs" />
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>📦 Capacity Settings</h4>
                    <div className={styles.formGrid}>
                      <div className={styles.capacityInputGroup}>
                        <label htmlFor="editStationCapacity" className={styles.label}>
                          Maximum Luggage Capacity
                        </label>
                        <div className={styles.capacityControls}>
                          <button type="button" onClick={() => setEditStationCapacity((prev) => Math.max(10, prev - 10))} className={styles.capacityBtn}>
                            −
                          </button>
                          <input
                            type="number"
                            id="editStationCapacity"
                            value={editStationCapacity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 10;
                              setEditStationCapacity(Math.min(100, Math.max(10, val)));
                            }}
                            min="10"
                            max="100"
                            className={styles.capacityInput}
                          />
                          <button type="button" onClick={() => setEditStationCapacity((prev) => Math.min(100, prev + 10))} className={styles.capacityBtn}>
                            +
                          </button>
                        </div>
                        <p className={styles.capacityHint}>Current capacity: {editStationCapacity} bags. System blocks at 90% ({Math.floor(editStationCapacity * 0.9)} bags).</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>🏦 Bank / Payout Details</h4>
                    <div className={styles.formGrid}>
                      <input className={`${styles.input} ${styles.fullWidth}`} value={editStationBank.accountHolderName} onChange={(e) => handleEditStationBankChange("accountHolderName", e.target.value)} placeholder="Account Holder Name" />
                      <input className={`${styles.input} ${styles.fullWidth}`} value={editStationBank.bankName} onChange={(e) => handleEditStationBankChange("bankName", e.target.value)} placeholder="Bank Name" />
                      <input className={styles.input} value={editStationBank.bsb} onChange={(e) => handleEditStationBankChange("bsb", e.target.value)} placeholder="BSB (e.g., 062000)" maxLength={6} />
                      <input className={styles.input} value={editStationBank.accountNumber} onChange={(e) => handleEditStationBankChange("accountNumber", e.target.value)} placeholder="Account Number" />
                      <input className={`${styles.input} ${styles.fullWidth}`} value={editStationBank.payoutEmail} onChange={(e) => handleEditStationBankChange("payoutEmail", e.target.value)} placeholder="Payout Email (PayPal/Wise) — optional" />
                      <select className={`${styles.input} ${styles.fullWidth}`} value={editStationBank.accountType} onChange={(e) => handleEditStationBankChange("accountType", e.target.value)}>
                        <option value="savings">Savings Account</option>
                        <option value="checking">Checking Account</option>
                        <option value="business">Business Account</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>⏰ Store Operating Hours</h4>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" checked={editStationTimings.is24Hours} onChange={handleEditStation24Toggle} className={styles.checkbox} />
                      Open 24 Hours
                    </label>

                    {!editStationTimings.is24Hours && (
                      <div className={styles.timingsContainer}>
                        {daysOfWeek.map((day) => (
                          <div key={day} className={styles.dayTiming}>
                            <div className={styles.dayHeader}>
                              <strong className={styles.dayName}>{day.charAt(0).toUpperCase() + day.slice(1)}</strong>
                              <button type="button" className={styles.applyAllButton} onClick={() => applyEditTimingToAllDays(day)}>
                                Apply to All
                              </button>
                            </div>
                            <label className={styles.checkboxLabel}>
                              <input type="checkbox" checked={editStationTimings[day].closed} onChange={(e) => handleEditStationTimingChange(day, "closed", e.target.checked)} className={styles.checkbox} />
                              Closed
                            </label>
                            {!editStationTimings[day].closed && (
                              <div className={styles.timeInputs}>
                                <div className={styles.timeGroup}>
                                  <label className={styles.timeLabel}>Open:</label>
                                  <input type="time" className={styles.timeInput} value={editStationTimings[day].open} onChange={(e) => handleEditStationTimingChange(day, "open", e.target.value)} />
                                </div>
                                <div className={styles.timeGroup}>
                                  <label className={styles.timeLabel}>Close:</label>
                                  <input type="time" className={styles.timeInput} value={editStationTimings[day].close} onChange={(e) => handleEditStationTimingChange(day, "close", e.target.value)} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.buttonGroup} style={{ marginTop: 12 }}>
                    <button className={styles.updateButton} onClick={handleSaveStationEdits}>
                      Save Changes
                    </button>
                    <button className={styles.deleteButton} onClick={() => { setShowStationEditForm(false); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Partners tab */}
          {activeTab === "partners" && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Manage Partners</h2>
                <div>
                  <button className={styles.addButton} onClick={() => { setShowPartnerForm((prev) => !prev); setPartnerFormVisibleForEdit(false); setEditingPartner(null); }}>
                    {showPartnerForm ? "✕ Cancel" : "+ Add Partner"}
                  </button>
                </div>
              </div>

              {showPartnerForm && (
                <div className={styles.formCard}>
                  <h3 className={styles.formTitle}>Create New Partner</h3>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>🔐 Login Information</h4>
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={partnerInfo.username} onChange={(e) => handlePartnerField("username", e.target.value)} placeholder="Username" />
                      <input className={styles.input} type="password" value={partnerInfo.password} onChange={(e) => handlePartnerField("password", e.target.value)} placeholder="Password" />
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>🏢 Business Information</h4>
                    <div className={styles.formGrid}>
                      <input className={`${styles.input} ${styles.fullWidth}`} value={partnerInfo.email} onChange={(e) => handlePartnerField("email", e.target.value)} placeholder="Email" />
                      <input className={styles.input} value={partnerInfo.phone} onChange={(e) => handlePartnerField("phone", e.target.value)} placeholder="Phone" />
                      <select className={`${styles.input} ${styles.fullWidth}`} value={partnerInfo.stationId} onChange={(e) => handlePartnerField("stationId", e.target.value)}>
                        <option value="">Select Station</option>
                        {stations.map((st) => <option key={st._id} value={st._id}>{st.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button className={styles.submitButton} onClick={handleCreatePartner}>Create Partner</button>
                </div>
              )}

              {partnerFormVisibleForEdit && editingPartner && (
                <div className={styles.formCard}>
                  <h3 className={styles.formTitle}>Edit Partner</h3>
                  <div className={styles.formSection}>
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={editingPartner.username} onChange={(e) => setEditingPartner((p) => ({ ...p, username: e.target.value }))} placeholder="Username" />
                      <input className={styles.input} type="password" value={editingPartner.password || ""} onChange={(e) => setEditingPartner((p) => ({ ...p, password: e.target.value }))} placeholder="New password (leave blank to keep)" />
                      <input className={styles.input} value={editingPartner.email} onChange={(e) => setEditingPartner((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
                      <input className={styles.input} value={editingPartner.phone} onChange={(e) => setEditingPartner((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
                      <select className={`${styles.input} ${styles.fullWidth}`} value={editingPartner.assignedStation} onChange={(e) => setEditingPartner((p) => ({ ...p, assignedStation: e.target.value }))}>
                        <option value="">Select Station</option>
                        {stations.map((st) => <option key={st._id} value={st._1}>{st.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.buttonGroup}>
                    <button className={styles.updateButton} onClick={handleUpdatePartner}>Save Changes</button>
                    <button className={styles.deleteButton} onClick={() => { setEditingPartner(null); setPartnerFormVisibleForEdit(false); }}>Cancel</button>
                  </div>
                </div>
              )}

              <div className={styles.listContainer}>
                {partners.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🤝</div>
                    <p className={styles.emptyText}>No partners yet. Create one using the button above.</p>
                  </div>
                ) : (
                  partners.map((partner) => (
                    <div key={partner._id} className={styles.listCard}>
                      <div className={styles.listCardHeader}>
                        <strong>{partner.username}</strong>
                        <div>
                          <button className={styles.smallButton} onClick={() => handleEditPartner(partner)}>Edit</button>
                          <button className={styles.smallDanger} onClick={() => handleDeletePartner(partner._id, partner.username)}>Delete</button>
                        </div>
                      </div>
                      <div className={styles.listCardBody}>
                        <p><strong>Email:</strong> {partner.email}</p>
                        <p><strong>Phone:</strong> {partner.phone || "-"}</p>
                        <p><strong>Station:</strong> {partner.assignedStation?.name || "Unassigned"}</p>
                        <p><strong>Created:</strong> {partner.createdAt ? new Date(partner.createdAt).toLocaleString() : "-"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* ── Payouts tab ─────────────────────────────────────────────── */}
          {activeTab === 'payouts' && (
            <div>

              {/* ── Partner Earnings ── */}
              <div style={{ marginBottom: 32 }}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Partner Earnings</h2>
                  <button
                    className={styles.smallButton}
                    onClick={() => { setPayoutTabLoaded(false); fetchPayoutSummaries(token); fetchBonusOffers(token); }}
                  >
                    ⟳ Refresh
                  </button>
                </div>

                {payoutSummariesLoading ? (
                  <div className={styles.emptyState}><p>Loading summaries…</p></div>
                ) : payoutSummaries.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>💳</div>
                    <p className={styles.emptyText}>No partner data yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {payoutSummaries.map(p => (
                      <div key={p.partnerId} style={{
                        background: '#fff', borderRadius: 12,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        border: '1px solid #e5e7eb', overflow: 'hidden',
                      }}>
                        {/* Partner header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{p.partnerName}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{p.stationName}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#6b7280', fontSize: 11 }}>All-time earned</div>
                              <div style={{ fontWeight: 700 }}>A${p.earningsAllTime.toFixed(2)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#6b7280', fontSize: 11 }}>Total paid</div>
                              <div style={{ fontWeight: 700, color: '#16a34a' }}>A${p.totalPaid.toFixed(2)}</div>
                            </div>
                            {p.outstanding > 0 && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#6b7280', fontSize: 11 }}>Outstanding</div>
                                <div style={{ fontWeight: 700, color: '#92400e' }}>A${p.outstanding.toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bonus progress bars (collapsible) */}
                        {p.bonusProgress?.filter(b => b._progress).length > 0 && (
                          <div style={{ padding: '10px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bonus Progress</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                              {p.bonusProgress.filter(b => b._progress).map(offer => {
                                const prog = offer._progress;
                                const pct = prog.earned ? 100 : Math.round((prog.current / prog.total) * 100);
                                return (
                                  <div key={offer.offerId} style={{ flex: '1 1 180px', minWidth: 160 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                                      <span style={{ color: '#374151' }}>{offer.name}</span>
                                      <span style={{ color: '#6b7280' }}>
                                        {prog.earned ? `✓ A$${offer.rewardAmount}` : `${prog.current}/${prog.total}`}
                                      </span>
                                    </div>
                                    <div style={{ background: '#e5e7eb', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: prog.earned ? '#16a34a' : '#0284C7', transition: 'width 0.4s ease' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Monthly breakdown rows */}
                        <div>
                          {(p.monthlyBreakdown || []).map((m, idx) => (
                            <div key={m.key} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 20px', gap: 12, flexWrap: 'wrap',
                              borderBottom: idx < (p.monthlyBreakdown.length - 1) ? '1px solid #f3f4f6' : 'none',
                              background: m.paid ? '#f0fdf4' : 'transparent',
                            }}>
                              {/* Month + status */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                                  background: m.paid ? '#dcfce7' : m.earnings > 0 ? '#fef3c7' : '#f3f4f6',
                                  color: m.paid ? '#16a34a' : m.earnings > 0 ? '#92400e' : '#9ca3af',
                                }}>
                                  {m.paid ? '✓' : m.earnings > 0 ? '!' : '–'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.month}</div>
                                  {m.paid && m.paidAt && (
                                    <div style={{ fontSize: 11, color: '#16a34a' }}>
                                      Paid {new Date(m.paidAt).toLocaleDateString('en-AU')}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Earnings amount */}
                              <div style={{ textAlign: 'right', minWidth: 80 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: m.earnings > 0 ? '#111' : '#9ca3af' }}>
                                  A${m.earnings.toFixed(2)}
                                </div>
                                {m.paid && m.paidAmount !== m.earnings && (
                                  <div style={{ fontSize: 11, color: '#6b7280' }}>paid A${m.paidAmount?.toFixed(2)}</div>
                                )}
                              </div>

                              {/* Action */}
                              {m.paid ? (
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#dcfce7', borderRadius: 6, padding: '4px 10px', whiteSpace: 'nowrap' }}>
                                  ✓ Paid
                                </span>
                              ) : (
                                <button
                                  onClick={() => openPayoutModal(p, m)}
                                  disabled={m.earnings === 0}
                                  style={{
                                    background: m.earnings > 0 ? '#0284C7' : '#f3f4f6',
                                    color: m.earnings > 0 ? '#fff' : '#9ca3af',
                                    border: 'none', borderRadius: 8,
                                    padding: '7px 16px', fontWeight: 600, fontSize: 13,
                                    cursor: m.earnings > 0 ? 'pointer' : 'default',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  💳 Mark as Paid
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Bonus Offers ── */}
              <div>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Bonus Offers</h2>
                  <button
                    className={styles.addButton}
                    onClick={() => setNewOffer(prev => ({ ...prev, show: !prev.show }))}
                  >
                    {newOffer.show ? '✕ Cancel' : '+ New Offer'}
                  </button>
                </div>

                {/* Create offer form */}
                {newOffer.show && (
                  <div className={styles.formCard} style={{ marginBottom: 20 }}>
                    <h3 className={styles.formTitle}>Create Bonus Offer</h3>
                    <div className={styles.formGrid}>
                      <input
                        className={`${styles.input} ${styles.fullWidth}`}
                        placeholder="Offer name (e.g. First 10 Bookings Bonus)"
                        value={newOffer.name}
                        onChange={e => setNewOffer(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <input
                        className={`${styles.input} ${styles.fullWidth}`}
                        placeholder="Description (optional)"
                        value={newOffer.description}
                        onChange={e => setNewOffer(prev => ({ ...prev, description: e.target.value }))}
                      />
                      <select
                        className={styles.input}
                        value={newOffer.type}
                        onChange={e => setNewOffer(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="rolling_window">Rolling Window</option>
                        <option value="calendar_month">Calendar Month</option>
                        <option value="all_time">All Time</option>
                      </select>
                      <input
                        className={styles.input}
                        type="number" min="1" placeholder="Threshold (bookings)"
                        value={newOffer.threshold}
                        onChange={e => setNewOffer(prev => ({ ...prev, threshold: e.target.value }))}
                      />
                      {newOffer.type === 'rolling_window' && (
                        <input
                          className={styles.input}
                          type="number" min="1" placeholder="Window days"
                          value={newOffer.windowDays}
                          onChange={e => setNewOffer(prev => ({ ...prev, windowDays: e.target.value }))}
                        />
                      )}
                      <input
                        className={styles.input}
                        type="number" min="0.01" step="0.01" placeholder="Reward A$"
                        value={newOffer.rewardAmount}
                        onChange={e => setNewOffer(prev => ({ ...prev, rewardAmount: e.target.value }))}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 16 }}>
                      {newOffer.type === 'rolling_window' && 'Partner earns bonus when they reach the threshold within a rolling window of N days. Resets from the last earned date.'}
                      {newOffer.type === 'calendar_month' && 'Partner earns bonus when they reach the threshold within the current calendar month. Resets on the 1st of each month.'}
                      {newOffer.type === 'all_time' && 'Partner earns this bonus once when their all-time bookings hit the threshold. Does not repeat.'}
                    </div>
                    <button
                      className={styles.submitButton}
                      onClick={handleCreateOffer}
                      disabled={newOffer.loading}
                    >
                      {newOffer.loading ? 'Creating…' : 'Create Offer'}
                    </button>
                  </div>
                )}

                {/* Offers list */}
                {bonusOffersLoading ? (
                  <div className={styles.emptyState}><p>Loading offers…</p></div>
                ) : bonusOffers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🎁</div>
                    <p className={styles.emptyText}>No bonus offers yet. Create one above.</p>
                  </div>
                ) : (
                  <div className={styles.listContainer}>
                    {bonusOffers.map(offer => (
                      <div key={offer._id} className={styles.listCard}>
                        <div className={styles.listCardHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <strong>{offer.name}</strong>
                            <span style={{
                              fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 7px',
                              background: offer.type === 'rolling_window' ? '#dbeafe' : offer.type === 'calendar_month' ? '#fce7f3' : '#dcfce7',
                              color: offer.type === 'rolling_window' ? '#1d4ed8' : offer.type === 'calendar_month' ? '#9d174d' : '#15803d',
                            }}>
                              {offer.type === 'rolling_window' ? 'Rolling' : offer.type === 'calendar_month' ? 'Monthly' : 'All Time'}
                            </span>
                            <span style={{
                              fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 7px',
                              background: offer.active ? '#dcfce7' : '#f3f4f6',
                              color: offer.active ? '#15803d' : '#9ca3af',
                            }}>
                              {offer.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className={styles.smallButton}
                              onClick={() => handleToggleOffer(offer._id, offer.active)}
                            >
                              {offer.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className={styles.smallDanger} onClick={() => handleDeleteOffer(offer._id, offer.name)}>
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className={styles.listCardBody}>
                          {offer.description && <p style={{ color: '#6b7280', marginBottom: 4 }}>{offer.description}</p>}
                          <p>
                            <strong>Threshold:</strong> {offer.threshold} bookings
                            {offer.windowDays ? ` within ${offer.windowDays} days` : ''}
                            &nbsp;→&nbsp;<strong>Reward: A${offer.rewardAmount}</strong>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ── Mark as Paid Modal ── */}
      {payoutModal.open && (
        <div
          role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget && !payoutModal.loading) setPayoutModal(prev => ({ ...prev, open: false })); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: '#eff6ff', padding: '16px 20px', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1d4ed8' }}>Record Payout</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{payoutModal.partner?.partnerName} — {payoutModal.partner?.stationName}</div>
              </div>
              <button onClick={() => setPayoutModal(prev => ({ ...prev, open: false }))} disabled={payoutModal.loading} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Summary */}
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                  <div><span style={{ color: '#6b7280' }}>Partner:</span> <strong>{payoutModal.partner?.partnerName}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>Station:</span> <strong>{payoutModal.partner?.stationName}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>All-time earned:</span> <strong>A${payoutModal.partner?.earningsAllTime?.toFixed(2)}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>Total paid so far:</span> <strong style={{ color: '#16a34a' }}>A${payoutModal.partner?.totalPaid?.toFixed(2)}</strong></div>
                  {(payoutModal.partner?.pendingBonusTotal ?? 0) > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6b7280' }}>Pending bonuses:</span> <strong style={{ color: '#d97706' }}>A${payoutModal.partner?.pendingBonusTotal?.toFixed(2)}</strong></div>
                  )}
                </div>
              </div>

              {/* Inputs */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>
                  Amount to Pay (A$) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={payoutModal.amount}
                  onChange={e => setPayoutModal(prev => ({ ...prev, amount: e.target.value }))}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>
                  Period Label <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text" placeholder="e.g. April 2026"
                  value={payoutModal.periodLabel}
                  onChange={e => setPayoutModal(prev => ({ ...prev, periodLabel: e.target.value }))}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea
                  value={payoutModal.notes}
                  onChange={e => setPayoutModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  rows={2}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 12px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {payoutModal.partner?.pendingBonuses?.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                  This payout will settle {payoutModal.partner.pendingBonuses.length} pending bonus{payoutModal.partner.pendingBonuses.length > 1 ? 'es' : ''} (A${payoutModal.partner.pendingBonusTotal.toFixed(2)}).
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className={styles.smallButton} onClick={() => setPayoutModal(prev => ({ ...prev, open: false }))} disabled={payoutModal.loading}>
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  disabled={payoutModal.loading || !payoutModal.amount || !payoutModal.periodLabel.trim()}
                  style={{
                    background: payoutModal.loading ? '#9ca3af' : '#0284C7',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 20px', fontWeight: 600, fontSize: 14,
                    cursor: payoutModal.loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {payoutModal.loading ? 'Recording…' : 'Confirm Payout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.open && (
        <div
          role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget && !rescheduleModal.loading) closeRescheduleModal(); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ background: '#eff6ff', padding: '16px 20px', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1d4ed8' }}>Reschedule Booking</div>
                {rescheduleModal.booking?.bookingReference && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Ref: <code>{rescheduleModal.booking.bookingReference}</code></div>
                )}
              </div>
              <button onClick={closeRescheduleModal} disabled={rescheduleModal.loading} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            {rescheduleModal.result ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Rescheduled</div>
                <div style={{ color: '#374151', marginBottom: 16, fontSize: 14 }}>{rescheduleModal.result.message}</div>

                {rescheduleModal.result.amountDiff < 0 && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                      💰 Customer is owed a refund
                    </div>
                    <div style={{ fontSize: 13, color: '#78350f', marginBottom: 12 }}>
                      New amount A${rescheduleModal.result.newAmount} is less than paid A${rescheduleModal.result.oldAmount}.
                      Difference: <strong>A${Math.abs(rescheduleModal.result.amountDiff).toFixed(2)}</strong>
                    </div>
                    {rescheduleModal.refundDone ? (
                      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                        ✅ A${rescheduleModal.refundDone.amount.toFixed(2)} refunded to customer via PayPal
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePartialRefund(rescheduleModal.booking, Math.abs(rescheduleModal.result.amountDiff), true)}
                        disabled={rescheduleModal.refunding}
                        style={{ width: '100%', background: rescheduleModal.refunding ? '#d1d5db' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: rescheduleModal.refunding ? 'not-allowed' : 'pointer' }}
                      >
                        {rescheduleModal.refunding ? '⏳ Processing refund…' : `Refund A$${Math.abs(rescheduleModal.result.amountDiff).toFixed(2)} to customer`}
                      </button>
                    )}
                  </div>
                )}

                {rescheduleModal.result.amountDiff > 0 && (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 16 }}>
                    <strong>Amount changed:</strong> A${rescheduleModal.result.oldAmount} → A${rescheduleModal.result.newAmount}
                    <div style={{ color: '#92400e', fontWeight: 600 }}>Customer owes A${rescheduleModal.result.amountDiff} more</div>
                  </div>
                )}

                <button className={styles.smallButton} onClick={closeRescheduleModal}>Close</button>
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                {/* Current booking summary */}
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13 }}>
                  <div><strong>{rescheduleModal.booking?.fullName}</strong> — {rescheduleModal.booking?.email}</div>
                  <div style={{ color: '#6b7280', marginTop: 4 }}>
                    {rescheduleModal.booking?.smallBagCount ?? 0} small · {rescheduleModal.booking?.largeBagCount ?? 0} large · A${rescheduleModal.booking?.totalAmount?.toFixed(2)}
                  </div>
                  <div style={{ color: '#6b7280', marginTop: 2, fontSize: 12 }}>
                    Current: {formatSimpleDate(rescheduleModal.booking?.dropOffDate)} → {formatSimpleDate(rescheduleModal.booking?.pickUpDate)}
                  </div>
                </div>

                {/* New dates */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 5 }}>
                      New Drop-off <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={rescheduleModal.dropOffDate}
                      onChange={e => setRescheduleModal(prev => ({ ...prev, dropOffDate: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 5 }}>
                      New Pick-up <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={rescheduleModal.pickUpDate}
                      onChange={e => setRescheduleModal(prev => ({ ...prev, pickUpDate: e.target.value }))}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Live price preview */}
                {rescheduleModal.dropOffDate && rescheduleModal.pickUpDate && new Date(rescheduleModal.pickUpDate) > new Date(rescheduleModal.dropOffDate) && (() => {
                  const newDays = Math.max(1, Math.ceil((new Date(rescheduleModal.pickUpDate) - new Date(rescheduleModal.dropOffDate)) / 86400000));
                  const b = rescheduleModal.booking;
                  const small = b?.smallBagCount || 0;
                  const large = b?.largeBagCount || 0;
                  const newAmt = small > 0 || large > 0
                    ? +(small * newDays * 3.99 + large * newDays * 8.49).toFixed(2)
                    : +((b?.luggageCount || 0) * newDays * 7.99).toFixed(2);
                  const diff = +(newAmt - (b?.totalAmount || 0)).toFixed(2);
                  return (
                    <div style={{ background: diff === 0 ? '#f0fdf4' : diff > 0 ? '#fef3c7' : '#f0fdf4', border: `1px solid ${diff > 0 ? '#fde68a' : '#86efac'}`, borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{newDays} day{newDays !== 1 ? 's' : ''}</span>
                        <span><strong>New amount: A${newAmt}</strong>{diff !== 0 && <span style={{ color: diff > 0 ? '#92400e' : '#15803d', marginLeft: 6 }}>({diff > 0 ? '+' : ''}A${diff})</span>}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Note */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 5 }}>Note (optional)</label>
                  <input
                    type="text"
                    value={rescheduleModal.note}
                    onChange={e => setRescheduleModal(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="e.g. Customer called to change dates"
                    style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className={styles.smallButton} onClick={closeRescheduleModal} disabled={rescheduleModal.loading}>Cancel</button>
                  <button
                    onClick={handleReschedule}
                    disabled={rescheduleModal.loading || !rescheduleModal.dropOffDate || !rescheduleModal.pickUpDate}
                    style={{
                      background: rescheduleModal.loading ? '#9ca3af' : '#1d4ed8',
                      color: '#fff', border: 'none', borderRadius: 8,
                      padding: '8px 20px', fontWeight: 600, fontSize: 14,
                      cursor: rescheduleModal.loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {rescheduleModal.loading ? 'Saving…' : 'Confirm Reschedule'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Refund Request Modal */}
      {rejectModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget && !rejectModal.loading) setRejectModal(prev => ({ ...prev, open: false })); }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 400, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 16 }}>Reject Refund Request</h3>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              {rejectModal.request?.bookingId?.fullName} · A${Number(rejectModal.request?.refundAmount || 0).toFixed(2)}
            </div>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>Reason <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Bags already checked in, no refund applicable"
              rows={3}
              style={{ width: '100%', borderRadius: 8, border: '1px solid #d1d5db', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'none', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(prev => ({ ...prev, open: false }))} disabled={rejectModal.loading}
                style={{ padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleRejectRefund} disabled={rejectModal.loading}
                style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: rejectModal.loading ? '#d1d5db' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: rejectModal.loading ? 'not-allowed' : 'pointer' }}>
                {rejectModal.loading ? 'Rejecting…' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel / Refund Modal */}
      {cancelModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !cancelModal.loading) closeCancelModal(); }}
        >
          <div style={{
            background: "#fff", borderRadius: 12, maxWidth: 480, width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ background: "#fef2f2", padding: "16px 20px", borderBottom: "1px solid #fecaca", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#dc2626" }}>Cancel Booking</div>
                {cancelModal.booking?.bookingReference && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Ref: <code>{cancelModal.booking.bookingReference}</code>
                  </div>
                )}
              </div>
              <button onClick={closeCancelModal} disabled={cancelModal.loading} style={{ background: "none", border: "none", fontSize: 20, cursor: cancelModal.loading ? "not-allowed" : "pointer", color: "#6b7280", opacity: cancelModal.loading ? 0.4 : 1 }}>✕</button>
            </div>

            {cancelModal.result ? (
              /* Success state */
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Done</div>
                <div style={{ color: "#374151", marginBottom: 8 }}>{cancelModal.result.message}</div>
                {cancelModal.result.refund && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 12 }}>
                    <div>Refund ID: <code>{cancelModal.result.refund.refundId}</code></div>
                    <div>Amount: <strong>A${cancelModal.result.refund.amount}</strong></div>
                    <div>Status: <strong>{cancelModal.result.refund.status}</strong></div>
                  </div>
                )}
                <button className={styles.smallButton} onClick={closeCancelModal}>Close</button>
              </div>
            ) : (
              /* Form state */
              <div style={{ padding: 24 }}>
                {/* Booking summary */}
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
                  <div><strong>{cancelModal.booking?.fullName}</strong> — {cancelModal.booking?.email}</div>
                  <div style={{ marginTop: 4, color: "#6b7280" }}>
                    {cancelModal.booking?.smallBagCount ?? 0} small · {cancelModal.booking?.largeBagCount ?? 0} large ·{" "}
                    A${cancelModal.booking?.totalAmount?.toFixed(2)}
                  </div>
                  {cancelModal.booking?.status === "stored" && (
                    <div style={{ marginTop: 6, background: "#fef3c7", borderRadius: 6, padding: "6px 10px", color: "#92400e", fontWeight: 600, fontSize: 12 }}>
                      ⚠️ Bags are currently stored at the station
                    </div>
                  )}
                </div>

                {/* Refund toggle */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Refund</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14,
                      background: cancelModal.issueRefund ? "#dcfce7" : "#f3f4f6",
                      border: cancelModal.issueRefund ? "1px solid #86efac" : "1px solid #e5e7eb",
                      borderRadius: 8, padding: "8px 14px", flex: "1 1 140px", justifyContent: "center" }}>
                      <input type="radio" name="refundType" checked={cancelModal.issueRefund}
                        onChange={() => setCancelModal((prev) => ({ ...prev, issueRefund: true }))} />
                      Full refund (A${cancelModal.booking?.totalAmount?.toFixed(2)})
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14,
                      background: !cancelModal.issueRefund ? "#fee2e2" : "#f3f4f6",
                      border: !cancelModal.issueRefund ? "1px solid #fca5a5" : "1px solid #e5e7eb",
                      borderRadius: 8, padding: "8px 14px", flex: "1 1 100px", justifyContent: "center" }}>
                      <input type="radio" name="refundType" checked={!cancelModal.issueRefund}
                        onChange={() => setCancelModal((prev) => ({ ...prev, issueRefund: false }))} />
                      No refund
                    </label>
                  </div>
                </div>

                {/* Reason */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 6 }}>
                    Reason <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    value={cancelModal.reason}
                    onChange={(e) => setCancelModal((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Double booking, customer request, no-show..."
                    rows={3}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: "8px 12px", fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className={styles.smallButton} onClick={closeCancelModal} disabled={cancelModal.loading}>
                    Back
                  </button>
                  <button
                    onClick={handleCancelRefund}
                    disabled={cancelModal.loading || !cancelModal.reason.trim()}
                    style={{
                      background: cancelModal.loading ? "#9ca3af" : "#dc2626",
                      color: "#fff", border: "none", borderRadius: 8,
                      padding: "8px 20px", fontWeight: 600, fontSize: 14,
                      cursor: cancelModal.loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {cancelModal.loading
                      ? "Processing..."
                      : cancelModal.issueRefund
                      ? "Cancel & Refund"
                      : "Cancel Booking"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 9999,
            minWidth: 240,
            maxWidth: 420,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            borderRadius: 10,
            padding: "12px 16px",
            color: "#fff",
            display: "flex",
            gap: 12,
            alignItems: "center",
            background:
              toast.type === "success"
                ? "linear-gradient(90deg,#2ecc71,#27ae60)"
                : toast.type === "error"
                ? "linear-gradient(90deg,#f54e4e,#e03131)"
                : "linear-gradient(90deg,#f0ad4e,#ffcc00)",
          }}
        >
          <div style={{ fontSize: 18 }}>{toast.type === "success" ? "✅" : toast.type === "error" ? "⛔" : "ℹ️"}</div>
          <div style={{ fontSize: 14, lineHeight: "1.2" }}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
