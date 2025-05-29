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

  // Function to get week range string
  const getWeekRange = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday as start of week
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const formatDate = (d) => d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  // Function to calculate total amount for bookings
  const calculateBookingAmount = (booking) => {
    const dropOff = new Date(booking.dropOffDate);
    const pickUp = new Date(booking.pickUpDate);
    const days = Math.max(1, Math.ceil((pickUp - dropOff) / (1000 * 60 * 60 * 24))); // Minimum 1 day
    return booking.luggageCount * days * 7.99;
  };

  // Function to calculate total amount for an array of bookings
  const calculateTotalAmount = (bookings) => {
    return bookings.reduce((total, booking) => total + calculateBookingAmount(booking), 0);
  };

  // Function to group bookings by month and then by week
  const groupBookingsByMonth = (bookings) => {
    // First group by month
    const monthlyGrouped = {};
    
    bookings.forEach(booking => {
      const date = new Date(booking.dropOffDate);
      const monthYear = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      if (!monthlyGrouped[monthYear]) {
        monthlyGrouped[monthYear] = [];
      }
      monthlyGrouped[monthYear].push(booking);
    });

    // Sort months in descending order (newest first)
    const sortedMonths = Object.entries(monthlyGrouped).sort(([a], [b]) => {
      const dateA = new Date(a + ' 1');
      const dateB = new Date(b + ' 1');
      return dateB - dateA;
    });

    // Now group each month's bookings by week
    return sortedMonths.map(([month, monthBookings]) => {
      const weeklyGrouped = {};
      
      monthBookings.forEach(booking => {
        const date = new Date(booking.dropOffDate);
        const weekRange = getWeekRange(date);
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day;
        weekStart.setDate(diff);
        
        if (!weeklyGrouped[weekRange]) {
          weeklyGrouped[weekRange] = {
            bookings: [],
            weekStart: weekStart
          };
        }
        weeklyGrouped[weekRange].bookings.push(booking);
      });

      // Sort weeks in descending order (newest first)
      const sortedWeeks = Object.entries(weeklyGrouped).sort(([, a], [, b]) => {
        return b.weekStart - a.weekStart;
      });

      return [month, sortedWeeks];
    });
  };

  // Function to group key handovers by month and then by week
  const groupKeyHandoversByMonth = (handovers) => {
    // First group by month
    const monthlyGrouped = {};
    
    handovers.forEach(handover => {
      const date = new Date(handover.handoverDate);
      const monthYear = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      if (!monthlyGrouped[monthYear]) {
        monthlyGrouped[monthYear] = [];
      }
      monthlyGrouped[monthYear].push(handover);
    });

    // Sort months in descending order (newest first)
    const sortedMonths = Object.entries(monthlyGrouped).sort(([a], [b]) => {
      const dateA = new Date(a + ' 1');
      const dateB = new Date(b + ' 1');
      return dateB - dateA;
    });

    // Now group each month's handovers by week
    return sortedMonths.map(([month, monthHandovers]) => {
      const weeklyGrouped = {};
      
      monthHandovers.forEach(handover => {
        const date = new Date(handover.handoverDate);
        const weekRange = getWeekRange(date);
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day;
        weekStart.setDate(diff);
        
        if (!weeklyGrouped[weekRange]) {
          weeklyGrouped[weekRange] = {
            handovers: [],
            weekStart: weekStart
          };
        }
        weeklyGrouped[weekRange].handovers.push(handover);
      });

      // Sort weeks in descending order (newest first)
      const sortedWeeks = Object.entries(weeklyGrouped).sort(([, a], [, b]) => {
        return b.weekStart - a.weekStart;
      });

      return [month, sortedWeeks];
    });
  };

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
                    <div className="monthly-bookings">
                      {groupBookingsByMonth(filteredBookings).map(([month, weeks]) => {
                        const monthBookings = weeks.flatMap(([, weekData]) => weekData.bookings);
                        const monthTotal = calculateTotalAmount(monthBookings);
                        
                        return (
                          <div key={month} className="month-section">
                            <h4 className="month-header">
                              {month} ({monthBookings.length} bookings) - Total: A${monthTotal.toFixed(2)}
                            </h4>
                            {weeks.map(([weekRange, weekData]) => {
                              const weekTotal = calculateTotalAmount(weekData.bookings);
                              
                              return (
                                <div key={weekRange} className="week-section">
                                  <h5 className="week-header">
                                    {weekRange} ({weekData.bookings.length} bookings) - Total: A${weekTotal.toFixed(2)}
                                  </h5>
                                  <div className="booking-grid">
                                    {weekData.bookings.map((booking) => {
                                      const bookingAmount = calculateBookingAmount(booking);
                                      
                                      return (
                                        <div key={booking._id} className="booking-card">
                                          <p><strong>Name:</strong> {booking.fullName}</p>
                                          <p><strong>Email:</strong> {booking.email}</p>
                                          <p><strong>Phone:</strong> {booking.phone}</p>
                                          <p><strong>Drop-off:</strong> {booking.dropOffDate}</p>
                                          <p><strong>Pick-up:</strong> {booking.pickUpDate}</p>
                                          <p><strong>Luggage:</strong> {booking.luggageCount}</p>
                                          <p><strong>Amount:</strong> A${bookingAmount.toFixed(2)}</p>
                                          <p><strong>Payment ID:</strong> {booking.paymentId}</p>
                                          <p><strong>Instructions:</strong> {booking.specialInstructions || '-'}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
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
                    <div className="monthly-bookings">
                      {groupKeyHandoversByMonth(filteredKeyHandovers).map(([month, weeks]) => (
                        <div key={month} className="month-section">
                          <h4 className="month-header">
                            {month} ({weeks.reduce((total, [, weekData]) => total + weekData.handovers.length, 0)} handovers)
                          </h4>
                          {weeks.map(([weekRange, weekData]) => (
                            <div key={weekRange} className="week-section">
                              <h5 className="week-header">
                                {weekRange} ({weekData.handovers.length} handovers)
                              </h5>
                              <div className="booking-grid">
                                {weekData.handovers.map((handover) => (
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
                            </div>
                          ))}
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