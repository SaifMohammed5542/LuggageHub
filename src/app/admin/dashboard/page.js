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

  const [allBookings, setAllBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState('');

  const [allKeyHandovers, setAllKeyHandovers] = useState([]);
  const [filteredKeyHandovers, setFilteredKeyHandovers] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [keyError, setKeyError] = useState('');

  const [activeView, setActiveView] = useState('stations'); // 'stations', 'bookings', or 'keys'

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');

    if (storedToken && storedRole === 'admin') {
      setToken(storedToken);
      setUserRole('admin');
      fetchStations(storedToken);
      fetchBookings(storedToken);
      fetchKeyHandovers(storedToken);
    } else {
      router.push('/');
    }
  }, [router]);

  // When selectedStation changes, filter the bookings and key handovers
  useEffect(() => {
    if (selectedStation) {
      // Filter bookings by station ID
      const stationBookings = allBookings.filter(
        booking => booking.stationId?._id === selectedStation._id
      );
      setFilteredBookings(stationBookings);

      // Filter key handovers by station ID
      const stationKeyHandovers = allKeyHandovers.filter(
        handover => handover.station?._id === selectedStation._id
      );
      setFilteredKeyHandovers(stationKeyHandovers);
    }
  }, [selectedStation, allBookings, allKeyHandovers]);

  const fetchStations = async (authToken) => {
    try {
      const res = await fetch('/api/station/list', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) setStations(data.stations);
    } catch (err) {
      console.error('Failed to fetch stations:', err);
    }
  };

  const fetchBookings = async (authToken) => {
    setLoadingBookings(true);
    try {
      const res = await fetch('/api/admin/bookings', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch bookings');
      
      // Sort bookings by dropOffDate in descending order (newest first)
      const sortedBookings = [...(data.bookings || [])].sort((a, b) => {
        return new Date(b.dropOffDate) - new Date(a.dropOffDate);
      });
      
      setAllBookings(sortedBookings);
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchKeyHandovers = async (authToken) => {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/admin/key-handovers', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch key handovers');
      
      // Sort key handovers by handoverDate in descending order (newest first)
      const sortedHandovers = [...(data.handovers || [])].sort((a, b) => {
        return new Date(b.handoverDate) - new Date(a.handoverDate);
      });
      
      setAllKeyHandovers(sortedHandovers);
    } catch (err) {
      setKeyError(err.message);
    } finally {
      setLoadingKeys(false);
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

  const handleStationClick = (station) => {
    setSelectedStation(station);
    setActiveView('bookings'); // Switch to bookings view when a station is clicked
  };

  const handleBackToStations = () => {
    setSelectedStation(null);
    setActiveView('stations');
  };

  const toggleView = (view) => {
    setActiveView(view);
  };

  if (userRole !== 'admin') return null;

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

        {/* Stations and Bookings Display Section */}
        <div className="admin-section">
          {selectedStation ? (
            <>
              <div className="station-detail-header">
                <button className="back-button" onClick={handleBackToStations}>
                  ← Back to Stations
                </button>
                <h2>{selectedStation.name} - {selectedStation.location}</h2>
                <div className="view-toggle">
                  <button 
                    className={activeView === 'bookings' ? 'active' : ''} 
                    onClick={() => toggleView('bookings')}
                  >
                    Bookings
                  </button>
                  <button 
                    className={activeView === 'keys' ? 'active' : ''} 
                    onClick={() => toggleView('keys')}
                  >
                    Key Handovers
                  </button>
                </div>
              </div>

              {activeView === 'bookings' && (
                <>
                  <h3>Bookings</h3>
                  {loadingBookings ? (
                    <p>Loading bookings...</p>
                  ) : bookingError ? (
                    <p className="error">{bookingError}</p>
                  ) : filteredBookings.length === 0 ? (
                    <p>No bookings found for this station.</p>
                  ) : (
                    <div className="booking-grid">
                      {filteredBookings.map((booking) => (
                        <div key={booking._id} className="booking-card">
                          <p><strong>Name:</strong> {booking.fullName}</p>
                          <p><strong>Email:</strong> {booking.email}</p>
                          <p><strong>Phone:</strong> {booking.phone}</p>
                          <p><strong>Drop-off:</strong> {booking.dropOffDate}</p>
                          <p><strong>Pick-up:</strong> {booking.pickUpDate}</p>
                          <p><strong>Luggage:</strong> {booking.luggageCount}</p>
                          <p><strong>Payment ID:</strong> {booking.paymentId}</p>
                          <p><strong>Instructions:</strong> {booking.specialInstructions || '-'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeView === 'keys' && (
                <>
                  <h3>Key Handovers</h3>
                  {loadingKeys ? (
                    <p>Loading key handovers...</p>
                  ) : keyError ? (
                    <p className="error">{keyError}</p>
                  ) : filteredKeyHandovers.length === 0 ? (
                    <p>No key handovers found for this station.</p>
                  ) : (
                    <div className="booking-grid">
                      {filteredKeyHandovers.map((handover) => (
                        <div key={handover._id} className="booking-card">
                          <p><strong>Name:</strong> {handover.fullName}</p>
                          <p><strong>Email:</strong> {handover.email}</p>
                          <p><strong>Phone:</strong> {handover.phone}</p>
                          <p><strong>Handover Date:</strong> {handover.handoverDate}</p>
                          <p><strong>Pickup Date:</strong> {handover.pickupDate}</p>
                          <p><strong>Instructions:</strong> {handover.specialInstructions || '-'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <h2>Stations</h2>
              {stations.length === 0 ? (
                <p>No stations found. Create a station to get started.</p>
              ) : (
                <div className="stations-grid">
                  {stations.map((station) => (
                    <div 
                      key={station._id} 
                      className="station-card" 
                      onClick={() => handleStationClick(station)}
                    >
                      <h3>{station.name}</h3>
                      <p>{station.location}</p>
                      <div className="station-stats">
                        <span>
                          {allBookings.filter(b => b.stationId?._id === station._id).length} Bookings
                        </span>
                        <span>
                          {allKeyHandovers.filter(k => k.station?._id === station._id).length} Key Handovers
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}