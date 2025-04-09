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
  const [bookings, setBookings] = useState([
    { id: 1, customer: 'Alice', luggageCount: 2, dropOff: '2025-04-05', pickUp: '2025-04-06', status: 'Confirmed' },
    { id: 2, customer: 'Bob', luggageCount: 1, dropOff: '2025-04-06', pickUp: '2025-04-08', status: 'Pending' },
  ]);

  const router = useRouter();

  useEffect(() => {
    const fetchStation = async () => {
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
        const res = await fetch(`/api/partner/${userId}/station`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.ok) {
          setStation(data.station);
        } else {
          console.error('Failed to fetch station', data.error);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchStation();
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
            <div key={booking.id} className="booking-row">
              <div><strong>{booking.customer}</strong></div>
              <div>Luggage: {booking.luggageCount}</div>
              <div>Drop-off: {booking.dropOff}</div>
              <div>Pick-up: {booking.pickUp}</div>
              <div className={`status-badge ${booking.status.toLowerCase()}`}>{booking.status}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
    </>
  );
}
