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
  const [stationLatitude, setStationLatitude] = useState('');
  const [stationLongitude, setStationLongitude] = useState('');
  const [partnerInfo, setPartnerInfo] = useState({
    username: '',
    password: '',
    businessName: '',
    businessAddress: '',
    email: '',
    phone: '',
    stationId: '',
    accountDetails: {
      bsb: '',
      accountNumber: '',
      accountHolderName: '',
      bankName: '',
      accountType: 'savings'
    },
    is24Hours: false,
    storeTimings: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: false }
    }
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

  // === NEW: edit state for selected station ===
  const [editStation, setEditStation] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: ''
  });

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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
  handover => handover.stationId?._id === selectedStation._id
);

      setFilteredKeyHandovers(stationKeyHandovers);

      // === NEW: prefill edit form with selected station values ===
      setEditStation({
        name: selectedStation.name || '',
        location: selectedStation.location || '',
        latitude: selectedStation.latitude !== undefined && selectedStation.latitude !== null ? String(selectedStation.latitude) : '',
        longitude: selectedStation.longitude !== undefined && selectedStation.longitude !== null ? String(selectedStation.longitude) : ''
      });
    }
  }, [selectedStation, allBookings, allKeyHandovers]);

  // Function to handle account details changes
  const handleAccountDetailsChange = (field, value) => {
    setPartnerInfo(prev => ({
      ...prev,
      accountDetails: {
        ...prev.accountDetails,
        [field]: value
      }
    }));
  };

  // Function to handle store timing changes
  const handleTimingChange = (day, field, value) => {
    setPartnerInfo(prev => ({
      ...prev,
      storeTimings: {
        ...prev.storeTimings,
        [day]: {
          ...prev.storeTimings[day],
          [field]: value
        }
      }
    }));
  };

  // Function to handle 24 hours toggle
  const handle24HoursToggle = () => {
    setPartnerInfo(prev => ({
      ...prev,
      is24Hours: !prev.is24Hours
    }));
  };

  // Function to apply same timing to all days
  const applyToAllDays = (day) => {
    const dayTiming = partnerInfo.storeTimings[day];
    const newTimings = {};
    daysOfWeek.forEach(d => {
      newTimings[d] = { ...dayTiming };
    });
    
    setPartnerInfo(prev => ({
      ...prev,
      storeTimings: newTimings
    }));
  };

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
    // 1. Convert latitude and longitude inputs to numbers
    const lat = parseFloat(stationLatitude);
    const lon = parseFloat(stationLongitude);

    // 2. Basic validation: make sure they are valid numbers
    if (isNaN(lat) || isNaN(lon)) {
      alert('Latitude and Longitude must be valid numbers.');
      return; // Stop the function if validation fails
    }

    const res = await fetch('/api/admin/station', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      // 3. Include latitude and longitude in the data sent to the backend
      body: JSON.stringify({
        name: stationName,
        location: stationLocation,
        latitude: lat,   // New: Sending latitude
        longitude: lon   // New: Sending longitude
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Station created');
      setStationName('');
      setStationLocation('');
      // 4. Clear the new latitude and longitude fields after success
      setStationLatitude('');
      setStationLongitude('');
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
        password: '',
        businessName: '',
        businessAddress: '',
        email: '',
        phone: '',
        stationId: '',
        accountDetails: {
          bsb: '',
          accountNumber: '',
          accountHolderName: '',
          bankName: '',
          accountType: 'savings'
        },
        is24Hours: false,
        storeTimings: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '09:00', close: '18:00', closed: false }
        }
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

  // === NEW: Update station ===
  const handleUpdateStation = async () => {
    if (!selectedStation?._id) return;

    // Build payload only with provided fields
    const payload = {
      name: editStation.name?.trim(),
      location: editStation.location?.trim()
    };

    // latitude/longitude optional but if provided must be valid numbers
    const lat = editStation.latitude === '' ? null : parseFloat(editStation.latitude);
    const lon = editStation.longitude === '' ? null : parseFloat(editStation.longitude);

    if (editStation.latitude !== '' && isNaN(lat)) {
      alert('Latitude must be a valid number.');
      return;
    }
    if (editStation.longitude !== '' && isNaN(lon)) {
      alert('Longitude must be a valid number.');
      return;
    }

    if (editStation.latitude !== '') payload.latitude = lat;
    if (editStation.longitude !== '') payload.longitude = lon;

    try {
      const res = await fetch(`/api/admin/station/${selectedStation._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update station');
      }

      // Update local state
      const updated = data.station;
      setStations(prev => prev.map(s => (s._id === updated._id ? updated : s)));
      setSelectedStation(updated);
      alert('Station updated');
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error updating station');
    }
  };

  // === NEW: Delete station ===
  const handleDeleteStation = async () => {
    if (!selectedStation?._id) return;

    const sure = window.confirm(`Delete station "${selectedStation.name}"? This cannot be undone.`);
    if (!sure) return;

    try {
      const res = await fetch(`/api/admin/station/${selectedStation._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete station');
      }

      // Remove from list and go back
      setStations(prev => prev.filter(s => s._id !== selectedStation._id));
      setSelectedStation(null);
      setActiveView('stations');
      alert('Station deleted successfully');
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error deleting station');
    }
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
            <input
              type="text" // Use text for decimal numbers
              value={stationLatitude}
              onChange={(e) => setStationLatitude(e.target.value)}
              placeholder="Latitude (e.g., -33.86)"
            />
            <input
              type="text" // Use text for decimal numbers
              value={stationLongitude}
              onChange={(e) => setStationLongitude(e.target.value)}
              placeholder="Longitude (e.g., 151.20)"
            />
            <button onClick={handleCreateStation}>Create Station</button>
          </div>
        </div>

        {/* Create Partner Section */}
        <div className="admin-section">
          <h2>Create Partner</h2>
          <div className="admin-form partner-form">
            
            {/* Login Information */}
            <div className="form-section">
              <h3 className="section-title">Login Information</h3>
              <div className="form-grid">
                <input
                  value={partnerInfo.username}
                  onChange={(e) => setPartnerInfo({ ...partnerInfo, username: e.target.value })}
                  placeholder="Username"
                />
                <input
                  type="password"
                  value={partnerInfo.password}
                  onChange={(e) => setPartnerInfo({ ...partnerInfo, password: e.target.value })}
                  placeholder="Password"
                />
              </div>
            </div>

            {/* Business Information */}
            <div className="form-section">
              <h3 className="section-title">Business Information</h3>
              <div className="form-grid">
                <input
                  value={partnerInfo.businessName}
                  onChange={(e) => setPartnerInfo({ ...partnerInfo, businessName: e.target.value })}
                  placeholder="Business Name"
                  className="full-width"
                />
                <textarea
                  value={partnerInfo.businessAddress}
                  onChange={(e) => setPartnerInfo({ ...partnerInfo, businessAddress: e.target.value })}
                  placeholder="Business Address"
                  className="full-width"
                  rows="3"
                />
                <input
                  type="email"
                  value={partnerInfo.email}
                  onChange={(e) => setPartnerInfo({ ...partnerInfo, email: e.target.value })}
                  placeholder="Business Email"
                />
                <input
                  value={partnerInfo.phone}
                  onChange={(e) => setPartnerInfo({ ...partnerInfo, phone: e.target.value })}
                  placeholder="Business Phone"
                />
                <select
                  value={partnerInfo.stationId}
                  onChange={(e) => setPartnerInfo({ ...partnerInfo, stationId: e.target.value })}
                  className="full-width"
                >
                  <option value="">Select Station</option>
                  {stations.map((station) => (
                    <option key={station._id} value={station._id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bank Account Details */}
            <div className="form-section">
              <h3 className="section-title">Bank Account Details</h3>
              <div className="form-grid">
                <input
                  value={partnerInfo.accountDetails.accountHolderName}
                  onChange={(e) => handleAccountDetailsChange('accountHolderName', e.target.value)}
                  placeholder="Account Holder Name"
                  className="full-width"
                />
                <input
                  value={partnerInfo.accountDetails.bankName}
                  onChange={(e) => handleAccountDetailsChange('bankName', e.target.value)}
                  placeholder="Bank Name"
                  className="full-width"
                />
                <input
                  value={partnerInfo.accountDetails.bsb}
                  onChange={(e) => handleAccountDetailsChange('bsb', e.target.value)}
                  placeholder="BSB (e.g., 062000)"
                  maxLength="6"
                />
                <input
                  value={partnerInfo.accountDetails.accountNumber}
                  onChange={(e) => handleAccountDetailsChange('accountNumber', e.target.value)}
                  placeholder="Account Number"
                />
                <select
                  value={partnerInfo.accountDetails.accountType}
                  onChange={(e) => handleAccountDetailsChange('accountType', e.target.value)}
                  className="full-width"
                >
                  <option value="savings">Savings Account</option>
                  <option value="checking">Checking Account</option>
                  <option value="business">Business Account</option>
                </select>
              </div>
            </div>

            {/* Store Timings Section */}
            <div className="form-section">
              <h3 className="section-title">Store Operating Hours</h3>
              
              <div className="timing-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={partnerInfo.is24Hours}
                    onChange={handle24HoursToggle}
                  />
                  Open 24 Hours
                </label>
              </div>

              {!partnerInfo.is24Hours && (
                <div className="weekly-timings">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="day-timing">
                      <div className="day-header">
                        <span className="day-name">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </span>
                        <button 
                          type="button"
                          className="apply-all-btn"
                          onClick={() => applyToAllDays(day)}
                          title="Apply this timing to all days"
                        >
                          Apply to All
                        </button>
                      </div>
                      
                      <div className="timing-controls">
                        <label className="closed-label">
                          <input
                            type="checkbox"
                            checked={partnerInfo.storeTimings[day].closed}
                            onChange={(e) => handleTimingChange(day, 'closed', e.target.checked)}
                          />
                          Closed
                        </label>
                        
                        {!partnerInfo.storeTimings[day].closed && (
                          <div className="time-inputs">
                            <div className="time-group">
                              <label>Open:</label>
                              <input
                                type="time"
                                value={partnerInfo.storeTimings[day].open}
                                onChange={(e) => handleTimingChange(day, 'open', e.target.value)}
                              />
                            </div>
                            <div className="time-group">
                              <label>Close:</label>
                              <input
                                type="time"
                                value={partnerInfo.storeTimings[day].close}
                                onChange={(e) => handleTimingChange(day, 'close', e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleCreatePartner} className="create-partner-btn">
              Create Partner
            </button>
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

              {/* === NEW: Inline Edit/Delete for the selected station === */}
              <div className="admin-section" style={{ marginTop: 16 }}>
                <h3>Edit Station</h3>
                <div className="admin-form">
                  <input
                    value={editStation.name}
                    onChange={(e) => setEditStation(s => ({ ...s, name: e.target.value }))}
                    placeholder="Station Name"
                  />
                  <input
                    value={editStation.location}
                    onChange={(e) => setEditStation(s => ({ ...s, location: e.target.value }))}
                    placeholder="Station Location"
                  />
                  <input
                    type="text"
                    value={editStation.latitude}
                    onChange={(e) => setEditStation(s => ({ ...s, latitude: e.target.value }))}
                    placeholder="Latitude (optional)"
                  />
                  <input
                    type="text"
                    value={editStation.longitude}
                    onChange={(e) => setEditStation(s => ({ ...s, longitude: e.target.value }))}
                    placeholder="Longitude (optional)"
                  />
                  <div className="station-actions">
                    <button onClick={handleUpdateStation}>Update Station</button>
                    <button onClick={handleDeleteStation} className="danger">
                      Delete Station
                    </button>
                  </div>
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
      <p><strong>Drop-off:</strong> {handover.dropOffPerson?.name} ({handover.dropOffPerson?.email || "no email"})</p>
      <p><strong>Pick-up:</strong> {handover.pickUpPerson?.name} ({handover.pickUpPerson?.email || "no email"})</p>
      <p><strong>Drop-off Date:</strong> {handover.dropOffDate}</p>
      <p><strong>Pick-up Date:</strong> {handover.pickUpDate}</p>
      <p><strong>Pickup Code:</strong> {handover.keyCode}</p>
      <p><strong>Amount:</strong> A${handover.price?.toFixed(2)}</p>
      <p><strong>Payment ID:</strong> {handover.paymentId}</p>
      <p><strong>Status:</strong> {handover.status}</p>
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
                          {allKeyHandovers.filter(k => k.stationId?._id === station._id).length} Key Handovers
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
