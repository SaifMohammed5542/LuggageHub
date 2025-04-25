'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { decodeToken } from '../../../utils/decodeToken';
import '../../../../public/ALL CSS/PartnerDashboard.css';

export default function PartnerDashboard() {
  const [station, setStation] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [bookings, setBookings] = useState([]);
  const [handovers, setHandovers] = useState([]);      // ← new state
  const router = useRouter();

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
        // Fetch assigned station
        const stationRes = await fetch(`/api/partner/${userId}/station`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const stationData = await stationRes.json();
        if (stationRes.ok) setStation(stationData.station);

        // Fetch bookings
        const bookingsRes = await fetch(`/api/partner/${userId}/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const bookingsData = await bookingsRes.json();
        if (bookingsRes.ok) setBookings(bookingsData.bookings || []);

        // Fetch key handovers
        const hoRes = await fetch(`/api/partner/${userId}/key-handovers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const hoData = await hoRes.json();
        if (hoRes.ok) setHandovers(hoData.handovers || []);
        else console.error('Failed to fetch key handovers', hoData.message);
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchPartnerData();
  }, [router]);

  if (!isAuthorized) return <p>Checking access...</p>;

  return (
    <>
      <Header />

      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Welcome, {partnerName}</h1>
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.clear();
              router.push('/login');
            }}
          >
            Logout
          </button>
        </header>

        <section className="station-card">
          <h2>Your Assigned Station</h2>
          {station ? (
            <div className="station-info">
              <p><strong>Name:</strong> {station.name}</p>
              <p><strong>Location:</strong> {station.location}</p>
            </div>
          ) : (
            <p>Loading station info...</p>
          )}
        </section>

        <section className="bookings-section">
          <h2>Recent Bookings</h2>
          <div className="bookings-box">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <div key={booking._id} className="booking-row">
                  <div><strong>{booking.fullName}</strong></div>
                  <div>Luggage: {booking.luggageCount}</div>
                  <div>Drop-off: {booking.dropOffDate}</div>
                  <div>Pick-up: {booking.pickUpDate}</div>
                  <div className={`status-badge ${booking.status?.toLowerCase()}`}>
                    {booking.status}
                  </div>
                </div>
              ))
            ) : (
              <p>No bookings found for your station.</p>
            )}
          </div>
        </section>

        {/* ─────────── New Key Handovers Section ─────────── */}
        <section className="handovers-section">
          <h2>Key Handovers</h2>
          <div className="handovers-box">
            {handovers.length > 0 ? (
              handovers.map((h) => (
                <div key={h._id} className="handover-row">
                  <div><strong>Drop-off:</strong> {h.dropOffPerson?.name}</div>
                  <div><strong>Pick-up:</strong> {h.pickUpPerson?.name}</div>
                  <div><strong>Drop-off Date:</strong> {new Date(h.dropOffDate).toLocaleDateString()}</div>
                  <div><strong>Pick-up Date:</strong> {new Date(h.pickUpDate).toLocaleDateString()}</div>
                  <div><strong>Code:</strong> <code>{h.keyCode}</code></div>
                  <div className={`status-badge ${h.status}`}>{h.status}</div>
                </div>
              ))
            ) : (
              <p>No key handovers found for your station.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
