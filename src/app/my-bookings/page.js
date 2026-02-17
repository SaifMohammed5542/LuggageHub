// app/my-bookings/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./MyBookings.module.css";

// ── Smart date-based status calculation ───────────────────
// Always respect cancelled/no_show from DB.
// For everything else, calculate from current date/time vs booking dates.
function getDisplayStatus(booking) {
  const { status, dropOffDate, pickUpDate } = booking;

  // These are always respected from the database
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

  // Now is AFTER pick-up time → Completed
  if (now > pickUp) {
    return {
      label: "Completed",
      emoji: "🏁",
      color: "completed",
      description: "Pick-up date has passed",
    };
  }

  // Now is AFTER drop-off AND BEFORE pick-up → Stored
  if (now > dropOff && now <= pickUp) {
    return {
      label: "Stored",
      emoji: "📦",
      color: "stored",
      description: "Luggage should be stored — pick-up upcoming",
    };
  }

  // Now is BEFORE drop-off → Active / upcoming
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

// ── Guest Prompt ───────────────────────────────────────────
function GuestPrompt() {
  return (
    <div className={styles.guestPage}>
      <Header />
      <main className={styles.guestMain}>
        <div className={styles.guestCard}>
          <div className={styles.guestIconWrapper}>
            <span className={styles.guestIcon}>🧳</span>
          </div>

          <h1 className={styles.guestTitle}>Access Your Bookings</h1>
          <p className={styles.guestSubtitle}>
            Login to view and manage all your luggage storage bookings
          </p>

          <div className={styles.guestInfoBox}>
            <div className={styles.guestInfoItem}>
              <span className={styles.guestInfoIcon}>🔑</span>
              <div>
                <strong>Already have an account?</strong>
                <p>Simply login using the same email address you used when making your booking — all your bookings will be right there waiting for you.</p>
              </div>
            </div>
            <div className={styles.guestDivider} />
            <div className={styles.guestInfoItem}>
              <span className={styles.guestInfoIcon}>📧</span>
              <div>
                <strong>Booked as a guest? No problem!</strong>
                <p>Create a free account using the same email address you used when booking. Once you verify your email and log in, all your previous guest bookings will automatically appear here.</p>
              </div>
            </div>
            <div className={styles.guestDivider} />
            <div className={styles.guestInfoItem}>
              <span className={styles.guestInfoIcon}>✨</span>
              <div>
                <strong>What you can do once logged in</strong>
                <p>View full booking details, check drop-off and pick-up times, track your luggage status, and see your complete booking history — all in one place.</p>
              </div>
            </div>
          </div>

          <div className={styles.guestButtons}>
            <Link href="/auth/login" className={styles.guestLoginBtn}>
              Login to View My Bookings
            </Link>
            <Link href="/auth/register" className={styles.guestRegisterBtn}>
              Create a Free Account
            </Link>
          </div>

          <p className={styles.guestNote}>
            💡 Important: Use the same email address you used when making your booking to access your booking history.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Booking Card ───────────────────────────────────────────
function BookingCard({ booking }) {
  const [expanded, setExpanded] = useState(false);
  const status = getDisplayStatus(booking);
  const days = calcDays(booking.dropOffDate, booking.pickUpDate);
  const stationName = booking.stationId?.name || "Unknown Station";
  const stationLocation = booking.stationId?.location || booking.stationId?.address || "";

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
//   const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [username, setUsername] = useState("");

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
      setIsEmailVerified(data.isEmailVerified);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Not logged in → show guest prompt
  if (!isLoggedIn && !loading) {
    return <GuestPrompt />;
  }

  const filtered = filterBookings(bookings, activeFilter);

  // Count per filter
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

          {/* Page Header */}
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

          {/* Loading */}
          {loading && (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p>Loading your bookings...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={styles.errorState}>
              <span>⚠️</span>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Try Again</button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* Filter Tabs */}
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

              {/* Bookings List */}
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
                    <BookingCard key={booking._id} booking={booking} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}