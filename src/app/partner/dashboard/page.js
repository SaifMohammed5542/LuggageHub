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
  const [bookings, setBookings] = useState([]); // Initialize as an empty array

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const stationData = await stationRes.json();

        if (stationRes.ok) {
          setStation(stationData.station);
        } else {
          console.error('Failed to fetch station', stationData.error);
        }

        // Fetch bookings for the partner's station
        const bookingsRes = await fetch(`/api/partner/${userId}/bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const bookingsData = await bookingsRes.json();

        if (bookingsRes.ok) {
          setBookings(bookingsData.bookings || []);
        } else {
          console.error('Failed to fetch bookings', bookingsData.error);
        }

      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchPartnerData();
  }, [router]);

  if (!isAuthorized) {
    return <p>Checking access...</p>;
  }

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
            {bookings.map((booking) => (
              <div key={booking._id} className="booking-row">
                <div><strong>{booking.fullName}</strong></div> {/* Assuming booking has fullName */}
                <div>Luggage: {booking.luggageCount}</div>
                <div>Drop-off: {booking.dropOffDate}</div> {/* Assuming booking has dropOffDate */}
                <div>Pick-up: {booking.pickUpDate}</div> {/* Assuming booking has pickUpDate */}
                <div className={`status-badge ${booking.status?.toLowerCase()}`}>{booking.status}</div> {/* Assuming booking has status */}
              </div>
            ))}
            {bookings.length === 0 && <p>No bookings found for your station.</p>}
          </div>
        </section>
      </div>
    </>
  );
}