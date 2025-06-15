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
  const [handovers, setHandovers] = useState([]);
  const router = useRouter();

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
      const date = new Date(handover.dropOffDate);
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
        const date = new Date(handover.dropOffDate);
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
        if (bookingsRes.ok) {
          // Sort bookings by dropOffDate in descending order (newest first)
          const sortedBookings = [...(bookingsData.bookings || [])].sort((a, b) => {
            return new Date(b.dropOffDate) - new Date(a.dropOffDate);
          });
          setBookings(sortedBookings);
        }

        // Fetch key handovers
        const hoRes = await fetch(`/api/partner/${userId}/key-handovers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const hoData = await hoRes.json();
        if (hoRes.ok) {
          // Sort handovers by dropOffDate in descending order (newest first)
          const sortedHandovers = [...(hoData.handovers || [])].sort((a, b) => {
            return new Date(b.dropOffDate) - new Date(a.dropOffDate);
          });
          setHandovers(sortedHandovers);
        } else {
          console.error('Failed to fetch key handovers', hoData.message);
        }
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
          <h2>Bookings</h2>
          <div className="bookings-box">
            {bookings.length > 0 ? (
              <div className="monthly-bookings">
                {groupBookingsByMonth(bookings).map(([month, weeks]) => {
                  const monthBookings = weeks.flatMap(([, weekData]) => weekData.bookings);
                  const monthTotal = calculateTotalAmount(monthBookings);
                  
                  return (
                    <div key={month} className="month-section">
                      <h4 className="month-header">
                        {month} ({monthBookings.length} bookings) - Revenue: A${monthTotal.toFixed(2)}
                      </h4>
                      {weeks.map(([weekRange, weekData]) => {
                        const weekTotal = calculateTotalAmount(weekData.bookings);
                        
                        return (
                          <div key={weekRange} className="week-section">
                            <h5 className="week-header">
                              {weekRange} ({weekData.bookings.length} bookings) - Revenue: A${weekTotal.toFixed(2)}
                            </h5>
                            <div className="booking-grid">
                              {weekData.bookings.map((booking) => {
                                const bookingAmount = calculateBookingAmount(booking);
                                
                                return (
                                  <div key={booking._id} className="booking-card">
                                    <div className="booking-header">
                                      <strong>{booking.fullName}</strong>
                                      <span className={`status-badge ${booking.status?.toLowerCase()}`}>
                                        {booking.status}
                                      </span>
                                    </div>
                                    <div className="booking-details">
                                      <p><strong>Email:</strong> {booking.email}</p>
                                      <p><strong>Phone:</strong> {booking.phone}</p>
                                      <p><strong>Luggage:</strong> {booking.luggageCount}</p>
                                      <p><strong>Drop-off:</strong> {booking.dropOffDate}</p>
                                      <p><strong>Pick-up:</strong> {booking.pickUpDate}</p>
                                      <p><strong>Amount:</strong> A${bookingAmount.toFixed(2)}</p>
                                      {booking.specialInstructions && (
                                        <p><strong>Instructions:</strong> {booking.specialInstructions}</p>
                                      )}
                                    </div>
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
            ) : (
              <p>No bookings found for your station.</p>
            )}
          </div>
        </section>

        <section className="handovers-section">
          <h2>Key Handovers</h2>
          <div className="handovers-box">
            {handovers.length > 0 ? (
              <div className="monthly-handovers">
                {groupKeyHandoversByMonth(handovers).map(([month, weeks]) => (
                  <div key={month} className="month-section">
                    <h4 className="month-header">
                      {month} ({weeks.reduce((total, [, weekData]) => total + weekData.handovers.length, 0)} handovers)
                    </h4>
                    {weeks.map(([weekRange, weekData]) => (
                      <div key={weekRange} className="week-section">
                        <h5 className="week-header">
                          {weekRange} ({weekData.handovers.length} handovers)
                        </h5>
                        <div className="handover-grid">
                          {weekData.handovers.map((h) => (
                            <div key={h._id} className="handover-card">
                              <div className="handover-header">
                                <strong>Key Handover</strong>
                                <span className={`status-badge ${h.status}`}>{h.status}</span>
                              </div>
                              <div className="handover-details">
                                <p><strong>Drop-off Person:</strong> {h.dropOffPerson?.name}</p>
                                <p><strong>Pick-up Person:</strong> {h.pickUpPerson?.name}</p>
                                <p><strong>Drop-off Date:</strong> {new Date(h.dropOffDate).toLocaleDateString()}</p>
                                <p><strong>Pick-up Date:</strong> {new Date(h.pickUpDate).toLocaleDateString()}</p>
                                <p><strong>Key Code:</strong> <code>{h.keyCode}</code></p>
                                {h.specialInstructions && (
                                  <p><strong>Instructions:</strong> {h.specialInstructions}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p>No key handovers found for your station.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}