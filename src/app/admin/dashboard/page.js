'use client';

import { useState, useEffect } from 'react';
import '../../../../public/ALL CSS/AdminDashboard.css';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';

export default function AdminDashboard() {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();
  const [stationName, setStationName] = useState('');
  const [stationLocation, setStationLocation] = useState('');
  const [partnerInfo, setPartnerInfo] = useState({
    username: '',
    email: '',
    password: '',
    stationId: ''
  });
  const [stations, setStations] = useState([]);
  const [token, setToken] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');

    if (storedToken && storedRole === 'admin') {
      setToken(storedToken);
      setUserRole('admin');
      fetchStations(storedToken);
      fetchBookings(storedToken);
    } else {
      // Redirect to homepage if not an admin or no token
      router.push('/');
    }
  }, [router]);

  const fetchStations = async (authToken) => {
    const res = await fetch('/api/station/list', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    const data = await res.json();
    if (res.ok) {
      setStations(data.stations);
    }
  };

  const fetchBookings = async (authToken) => {
    setLoadingBookings(true);
    try {
      const res = await fetch('/api/admin/bookings', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch bookings');
      setBookings(data.bookings || []);
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleCreateStation = async () => {
    const res = await fetch('/api/admin/station', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: stationName, location: stationLocation })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Station created');
      setStationName('');
      setStationLocation('');
      fetchStations(token);
    } else {
      alert(data.error || 'Error creating station');
    }
  };

  const handleCreatePartner = async () => {
    const res = await fetch('/api/admin/partner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(partnerInfo)
    });

    const data = await res.json();
    if (res.ok) {
      alert('Partner created');
      setPartnerInfo({
        username: '',
        email: '',
        password: '',
        stationId: ''
      });
    } else {
      alert(data.error || 'Error creating partner');
    }
  };

  // Render nothing if the user role is not 'admin' (after the initial check)
  if (userRole !== 'admin') {
    return null; // Or you could render a "Unauthorized" message here
  }

  return (
    <>
    <Header />

    <div className="admin-dashboard">
      <h1 className="admin-title">Admin Dashboard</h1>

      {/* Create Station Section */}
      <div className="admin-section">
        <h2>Create Station</h2>
        <div className="admin-form">
          <input
            value={stationName}
            onChange={(e) => setStationName(e.target.value)}
            placeholder="Station Name"
          />
          <input
            value={stationLocation}
            onChange={(e) => setStationLocation(e.target.value)}
            placeholder="Station Location"
          />
          <button onClick={handleCreateStation}>Create Station</button>
        </div>
      </div>

      {/* Create Partner Section */}
      <div className="admin-section">
        <h2>Create Partner</h2>
        <div className="admin-form">
          <input
            value={partnerInfo.username}
            onChange={(e) => setPartnerInfo({ ...partnerInfo, username: e.target.value })}
            placeholder="Username"
          />
          <input
            value={partnerInfo.email}
            onChange={(e) => setPartnerInfo({ ...partnerInfo, email: e.target.value })}
            placeholder="Email"
          />
          <input
            type="password"
            value={partnerInfo.password}
            onChange={(e) => setPartnerInfo({ ...partnerInfo, password: e.target.value })}
            placeholder="Password"
          />
          <select
            value={partnerInfo.stationId}
            onChange={(e) => setPartnerInfo({ ...partnerInfo, stationId: e.target.value })}
          >
            <option value="">Select Station</option>
            {stations.map((station) => (
              <option key={station._id} value={station._id}>
                {station.name}
              </option>
            ))}
          </select>
          <button onClick={handleCreatePartner}>Create Partner</button>
        </div>
      </div>

      {/* View Bookings Section */}
      <div className="admin-section">
        <h2>All Bookings</h2>
        {loadingBookings ? (
          <p>Loading bookings...</p>
        ) : bookingError ? (
          <p className="error">{bookingError}</p>
        ) : bookings.length === 0 ? (
          <p>No bookings found.</p>
        ) : (
          <div className="booking-grid">
            {bookings.map((booking) => (
              <div key={booking._id} className="booking-card">
                <p><strong>Name:</strong> {booking.fullName}</p>
                <p><strong>Email:</strong> {booking.email}</p>
                <p><strong>Phone:</strong> {booking.phone}</p>
                <p><strong>Drop-off:</strong> {booking.dropOffDate}</p>
                <p><strong>Pick-up:</strong> {booking.pickUpDate}</p>
                <p><strong>Luggage:</strong> {booking.luggageCount}</p>
                <p><strong>Station:</strong> {booking.stationId?.name || 'N/A'}</p>
                <p><strong>Payment ID:</strong> {booking.paymentId}</p>
                <p><strong>Instructions:</strong> {booking.specialInstructions || '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}