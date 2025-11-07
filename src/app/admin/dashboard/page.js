'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showStationForm, setShowStationForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [token, setToken] = useState('');

  // toast state
  const [toast, setToast] = useState({ show: false, msg: '', type: 'info' });
  const showToast = (msg, type = 'info', duration = 3000) => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), duration);
  };

  // Station create form
  const [stationName, setStationName] = useState('');
  const [stationLocation, setStationLocation] = useState('');
  const [stationLatitude, setStationLatitude] = useState('');
  const [stationLongitude, setStationLongitude] = useState('');
  const [stationImages, setStationImages] = useState(''); // optional comma-separated URLs
  const [stationBank, setStationBank] = useState({
    accountHolderName: '',
    bankName: '',
    bsb: '',
    accountNumber: '',
    accountType: 'savings',
    payoutEmail: '' // now optional
  });

  const defaultDayTiming = { open: '09:00', close: '18:00', closed: false };
  const [stationTimings, setStationTimings] = useState({
    monday: { ...defaultDayTiming },
    tuesday: { ...defaultDayTiming },
    wednesday: { ...defaultDayTiming },
    thursday: { ...defaultDayTiming },
    friday: { ...defaultDayTiming },
    saturday: { ...defaultDayTiming },
    sunday: { ...defaultDayTiming },
    is24Hours: false
  });

  // Partner create form
  const [partnerInfo, setPartnerInfo] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    stationId: ''
  });

  // Partners list + editing
  const [partners, setPartners] = useState([]);
  const [editingPartner, setEditingPartner] = useState(null); // object when editing
  const [partnerFormVisibleForEdit, setPartnerFormVisibleForEdit] = useState(false);

  // Stations + selection
  const [stations, setStations] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState('');
  const [allKeyHandovers, setAllKeyHandovers] = useState([]);
  const [filteredKeyHandovers, setFilteredKeyHandovers] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [keyError, setKeyError] = useState('');
  const [activeView, setActiveView] = useState('bookings');

  // Station edit UI state
  const [showStationEditForm, setShowStationEditForm] = useState(false);
  const [editStation, setEditStation] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: ''
  });
  const [editStationImages, setEditStationImages] = useState('');
  const [editStationBank, setEditStationBank] = useState({
    accountHolderName: '',
    bankName: '',
    bsb: '',
    accountNumber: '',
    accountType: 'savings',
    payoutEmail: ''
  });
  const [editStationTimings, setEditStationTimings] = useState({
    monday: { ...defaultDayTiming },
    tuesday: { ...defaultDayTiming },
    wednesday: { ...defaultDayTiming },
    thursday: { ...defaultDayTiming },
    friday: { ...defaultDayTiming },
    saturday: { ...defaultDayTiming },
    sunday: { ...defaultDayTiming },
    is24Hours: false
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
      fetchPartners(storedToken);
    } else {
      router.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (selectedStation) {
      const stationBookings = allBookings.filter(
        booking => booking.stationId?._id === selectedStation._id
      );
      setFilteredBookings(stationBookings);

      const stationKeyHandovers = allKeyHandovers.filter(
        handover => handover.stationId?._id === selectedStation._id
      );
      setFilteredKeyHandovers(stationKeyHandovers);

      const coords = selectedStation.coordinates?.coordinates || selectedStation.coordinates;
      let latValue = '';
      let lonValue = '';
      if (Array.isArray(coords) && coords.length === 2) {
        lonValue = String(coords[0]);
        latValue = String(coords[1]);
      } else {
        latValue = selectedStation.latitude !== undefined && selectedStation.latitude !== null ? String(selectedStation.latitude) : '';
        lonValue = selectedStation.longitude !== undefined && selectedStation.longitude !== null ? String(selectedStation.longitude) : '';
      }

      setEditStation({
        name: selectedStation.name || '',
        location: selectedStation.location || '',
        latitude: latValue,
        longitude: lonValue
      });

      // prefill bank/timings/images for edit form
      setEditStationBank({
        accountHolderName: selectedStation.bankDetails?.accountHolderName || '',
        bankName: selectedStation.bankDetails?.bankName || '',
        bsb: selectedStation.bankDetails?.bsb || '',
        accountNumber: selectedStation.bankDetails?.accountNumberEncrypted || '',
        accountType: selectedStation.bankDetails?.accountType || 'savings',
        payoutEmail: selectedStation.bankDetails?.payoutEmail || ''
      });

      setEditStationTimings(selectedStation.timings || {
        monday: { ...defaultDayTiming },
        tuesday: { ...defaultDayTiming },
        wednesday: { ...defaultDayTiming },
        thursday: { ...defaultDayTiming },
        friday: { ...defaultDayTiming },
        saturday: { ...defaultDayTiming },
        sunday: { ...defaultDayTiming },
        is24Hours: false
      });

      // images (assume array of URLs)
      setEditStationImages((selectedStation.images && selectedStation.images.join(', ')) || '');
    }
  }, [selectedStation, allBookings, allKeyHandovers]);

  const handleStationBankChange = (field, value) => {
    setStationBank(prev => ({ ...prev, [field]: value }));
  };

  const handleStationTimingChange = (day, field, value) => {
    setStationTimings(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleStation24Toggle = () => {
    setStationTimings(prev => ({ ...prev, is24Hours: !prev.is24Hours }));
  };

  const applyStationTimingToAllDays = (day) => {
    const dayTiming = stationTimings[day];
    const newTimings = {};
    daysOfWeek.forEach(d => {
      newTimings[d] = { ...dayTiming };
    });
    setStationTimings(prev => ({ ...prev, ...newTimings }));
  };

  // edit form helpers
  const handleEditStationBankChange = (field, value) => {
    setEditStationBank(prev => ({ ...prev, [field]: value }));
  };
  const handleEditStationTimingChange = (day, field, value) => {
    setEditStationTimings(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };
  const handleEditStation24Toggle = () => {
    setEditStationTimings(prev => ({ ...prev, is24Hours: !prev.is24Hours }));
  };
  const applyEditTimingToAllDays = (day) => {
    const dayTiming = editStationTimings[day];
    const newTimings = {};
    daysOfWeek.forEach(d => newTimings[d] = { ...dayTiming });
    setEditStationTimings(prev => ({ ...prev, ...newTimings }));
  };

  // Validator for station creation - requires bank details + timings (unless 24h)
  const validateStationForm = () => {
    if (!stationName.trim()) return { ok: false, message: 'Station name is required.' };
    if (!stationLocation.trim()) return { ok: false, message: 'Station location is required.' };
    if (!String(stationLatitude).trim() || !String(stationLongitude).trim()) return { ok: false, message: 'Latitude and Longitude are required.' };
    const lat = parseFloat(stationLatitude);
    const lon = parseFloat(stationLongitude);
    if (isNaN(lat) || isNaN(lon)) return { ok: false, message: 'Latitude and Longitude must be valid numbers.' };

    // bank details (payoutEmail is optional)
    if (!stationBank.accountHolderName?.trim()) return { ok: false, message: 'Account holder name is required.' };
    if (!stationBank.bankName?.trim()) return { ok: false, message: 'Bank name is required.' };
    if (!stationBank.bsb?.trim()) return { ok: false, message: 'BSB is required.' };
    if (!stationBank.accountNumber?.trim()) return { ok: false, message: 'Account number is required.' };

    // timings
    if (!stationTimings.is24Hours) {
      for (const d of daysOfWeek) {
        const dt = stationTimings[d];
        if (!dt) return { ok: false, message: `Timing for ${d} is missing.` };
        if (!dt.closed) {
          if (!dt.open || !dt.close) return { ok: false, message: `Open and close times required for ${d}.` };
          if (dt.open >= dt.close) return { ok: false, message: `${d.charAt(0).toUpperCase() + d.slice(1)}: open must be before close.` };
        }
      }
    }

    return { ok: true, message: 'OK' };
  };

  const isStationFormValid = () => validateStationForm().ok;

  const handlePartnerField = (field, value) => {
    setPartnerInfo(prev => ({ ...prev, [field]: value }));
  };

  const validatePartnerForm = () => {
    if (!partnerInfo.username?.trim()) return { ok: false, message: 'Username is required.' };
    if (!partnerInfo.email?.trim()) return { ok: false, message: 'Email is required.' };
    if (!partnerInfo.password || partnerInfo.password.length < 6) return { ok: false, message: 'Password (min 6 chars) is required.' };
    if (!partnerInfo.stationId) return { ok: false, message: 'Station selection is required.' };
    return { ok: true };
  };

  const getWeekRange = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  const calculateBookingAmount = (booking) => {
    const dropOff = new Date(booking.dropOffDate);
    const pickUp = new Date(booking.pickUpDate);
    const days = Math.max(1, Math.ceil((pickUp - dropOff) / (1000 * 60 * 60 * 24)));
    return booking.luggageCount * days * 7.99;
  };

  const calculateTotalAmount = (bookings) => bookings.reduce((t, b) => t + calculateBookingAmount(b), 0);

  const groupBookingsByMonth = (bookings) => {
    const monthlyGrouped = {};
    bookings.forEach(booking => {
      const date = new Date(booking.dropOffDate);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthlyGrouped[monthYear]) monthlyGrouped[monthYear] = [];
      monthlyGrouped[monthYear].push(booking);
    });

    const sortedMonths = Object.entries(monthlyGrouped).sort(([a], [b]) => new Date(b + ' 1') - new Date(a + ' 1'));

    return sortedMonths.map(([month, monthBookings]) => {
      const weeklyGrouped = {};
      monthBookings.forEach(booking => {
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
    handovers.forEach(handover => {
      const date = new Date(handover.handoverDate);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthlyGrouped[monthYear]) monthlyGrouped[monthYear] = [];
      monthlyGrouped[monthYear].push(handover);
    });

    const sortedMonths = Object.entries(monthlyGrouped).sort(([a], [b]) => new Date(b + ' 1') - new Date(a + ' 1'));

    return sortedMonths.map(([month, monthHandovers]) => {
      const weeklyGrouped = {};
      monthHandovers.forEach(handover => {
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
     API calls
     --------------------------- */

  // Stations
  const fetchStations = async (authToken) => {
    try {
      const res = await fetch('/api/admin/station', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) setStations(data.stations || []);
    } catch (err) {
      console.error('Failed to fetch stations:', err);
      showToast('Failed to load stations', 'error');
    }
  };

  // Bookings
  const fetchBookings = async (authToken) => {
    setLoadingBookings(true);
    try {
      const res = await fetch('/api/admin/bookings', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch bookings');
      const sortedBookings = [...(data.bookings || [])].sort((a, b) => new Date(b.dropOffDate) - new Date(a.dropOffDate));
      setAllBookings(sortedBookings);
    } catch (err) {
      setBookingError(err.message);
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoadingBookings(false);
    }
  };

  // Key handovers
  const fetchKeyHandovers = async (authToken) => {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/admin/key-handovers', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch key handovers');
      const sortedHandovers = [...(data.handovers || [])].sort((a, b) => new Date(b.handoverDate) - new Date(a.handoverDate));
      setAllKeyHandovers(sortedHandovers);
    } catch (err) {
      setKeyError(err.message);
      showToast('Failed to load key handovers', 'error');
    } finally {
      setLoadingKeys(false);
    }
  };

  // Partners: fetch list
  const fetchPartners = async (authToken) => {
    try {
      const res = await fetch('/api/admin/partner', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPartners(data.partners || []);
      } else {
        console.error('Failed to fetch partners:', data.error);
        showToast('Failed to load partners', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      showToast('Failed to load partners', 'error');
    }
  };

  // Create station (uses validateStationForm)
  const handleCreateStation = async () => {
    const validation = validateStationForm();
    if (!validation.ok) {
      showToast(validation.message, 'error');
      return;
    }

    const lat = parseFloat(stationLatitude);
    const lon = parseFloat(stationLongitude);
    const imagesArr = stationImages ? stationImages.split(',').map(i => i.trim()).filter(Boolean) : [];

    try {
      const res = await fetch('/api/admin/station', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: stationName.trim(),
          location: stationLocation.trim(),
          latitude: lat,
          longitude: lon,
          images: imagesArr,
          bankDetails: {
            accountHolderName: stationBank.accountHolderName.trim(),
            bankName: stationBank.bankName.trim(),
            bsb: stationBank.bsb.trim(),
            accountNumberEncrypted: stationBank.accountNumber.trim(),
            accountType: stationBank.accountType,
            payoutEmail: stationBank.payoutEmail.trim() || undefined
          },
          timings: { ...stationTimings },
          capacity: 0,
          description: ''
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Station created successfully!', 'success');
        setStationName('');
        setStationLocation('');
        setStationLatitude('');
        setStationLongitude('');
        setStationImages('');
        setStationBank({
          accountHolderName: '',
          bankName: '',
          bsb: '',
          accountNumber: '',
          accountType: 'savings',
          payoutEmail: ''
        });
        setStationTimings({
          monday: { ...defaultDayTiming },
          tuesday: { ...defaultDayTiming },
          wednesday: { ...defaultDayTiming },
          thursday: { ...defaultDayTiming },
          friday: { ...defaultDayTiming },
          saturday: { ...defaultDayTiming },
          sunday: { ...defaultDayTiming },
          is24Hours: false
        });
        setShowStationForm(false);
        fetchStations(token);
      } else {
        showToast(data.error || 'Error creating station', 'error');
      }
    } catch (err) {
      console.error('Create station error:', err);
      showToast(err.message || 'Server error creating station', 'error');
    }
  };

  // Create partner
  const handleCreatePartner = async () => {
    const validation = validatePartnerForm();
    if (!validation.ok) {
      showToast(validation.message, 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/partner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: partnerInfo.username.trim(),
          email: partnerInfo.email.trim(),
          password: partnerInfo.password,
          phone: partnerInfo.phone.trim(),
          stationId: partnerInfo.stationId
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Partner created successfully!', 'success');
        setPartnerInfo({
          username: '',
          password: '',
          email: '',
          phone: '',
          stationId: ''
        });
        setShowPartnerForm(false);
        fetchPartners(token);
        fetchStations(token);
      } else {
        showToast(data.error || 'Error creating partner', 'error');
      }
    } catch (err) {
      console.error('Create partner error:', err);
      showToast(err.message || 'Server error creating partner', 'error');
    }
  };

  // Prefill edit partner form
  const handleEditPartner = (partner) => {
    setEditingPartner({
      _id: partner._id,
      username: partner.username || '',
      email: partner.email || '',
      phone: partner.phone || '',
      assignedStation: partner.assignedStation?._id || ''
      // do not prefill password
    });
    setPartnerFormVisibleForEdit(true);
    setActiveTab('partners');
  };

  // Update partner
  const handleUpdatePartner = async () => {
    if (!editingPartner || !editingPartner._id) return;

    const payload = {
      username: editingPartner.username?.trim(),
      email: editingPartner.email?.trim(),
      phone: editingPartner.phone?.trim(),
      assignedStation: editingPartner.assignedStation || null
    };

    // allow password update if provided
    if (editingPartner.password) {
      if (editingPartner.password.length < 6) {
        showToast('Password should be at least 6 characters.', 'error');
        return;
      }
      payload.password = editingPartner.password;
    }

    try {
      const res = await fetch(`/api/admin/partner/${editingPartner._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update partner');

      showToast('Partner updated successfully!', 'success');
      setEditingPartner(null);
      setPartnerFormVisibleForEdit(false);
      fetchPartners(token);
      fetchStations(token);
    } catch (err) {
      console.error('Update partner error:', err);
      showToast(err.message || 'Error updating partner', 'error');
    }
  };

  // Delete partner
  const handleDeletePartner = async (partnerId, partnerUsername) => {
    const sure = window.confirm(`Delete partner "${partnerUsername}"? This action cannot be undone.`);
    if (!sure) return;

    try {
      const res = await fetch(`/api/admin/partner/${partnerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete partner');

      showToast('Partner deleted successfully!', 'success');
      fetchPartners(token);
      fetchStations(token);
    } catch (err) {
      console.error('Delete partner error:', err);
      showToast(err.message || 'Error deleting partner', 'error');
    }
  };

  // Save station edits (full edit - name, location, coords, images, bank, timings)
  const handleSaveStationEdits = async () => {
    if (!selectedStation?._id) return;

    // basic validation for latitude/longitude if provided
    const lat = editStation.latitude === '' ? null : parseFloat(editStation.latitude);
    const lon = editStation.longitude === '' ? null : parseFloat(editStation.longitude);
    if (editStation.latitude !== '' && isNaN(lat)) {
      showToast('Latitude must be a valid number.', 'error');
      return;
    }
    if (editStation.longitude !== '' && isNaN(lon)) {
      showToast('Longitude must be a valid number.', 'error');
      return;
    }

    // If timings are not 24h, ensure each day's times make sense
    if (!editStationTimings.is24Hours) {
      for (const d of daysOfWeek) {
        const dt = editStationTimings[d];
        if (!dt) {
          showToast(`Timing for ${d} is missing.`, 'error');
          return;
        }
        if (!dt.closed) {
          if (!dt.open || !dt.close) {
            showToast(`Open and close times required for ${d}.`, 'error');
            return;
          }
          if (dt.open >= dt.close) {
            showToast(`${d.charAt(0).toUpperCase() + d.slice(1)}: open must be before close.`, 'error');
            return;
          }
        }
      }
    }

    const imagesArr = editStationImages ? editStationImages.split(',').map(i => i.trim()).filter(Boolean) : [];

    const payload = {
      name: editStation.name?.trim(),
      location: editStation.location?.trim(),
      latitude: lat,
      longitude: lon,
      images: imagesArr,
      bankDetails: {
        accountHolderName: editStationBank.accountHolderName?.trim(),
        bankName: editStationBank.bankName?.trim(),
        bsb: editStationBank.bsb?.trim(),
        accountNumberEncrypted: editStationBank.accountNumber?.trim(),
        accountType: editStationBank.accountType,
        payoutEmail: editStationBank.payoutEmail?.trim() || undefined
      },
      timings: { ...editStationTimings }
    };

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
      if (!res.ok) throw new Error(data.error || 'Failed to save station edits');

      const updated = data.station;
      setStations(prev => prev.map(s => (s._id === updated._id ? updated : s)));
      setSelectedStation(updated);
      setShowStationEditForm(false);
      showToast('Station updated successfully!', 'success');
      fetchStations(token);
    } catch (err) {
      console.error('Save station edits error:', err);
      showToast(err.message || 'Error saving station edits', 'error');
    }
  };

  // Delete station (existing)
  const handleDeleteStation = async () => {
    if (!selectedStation?._id) return;

    const sure = window.confirm(`Delete station "${selectedStation.name}"? This cannot be undone.`);
    if (!sure) return;

    try {
      const res = await fetch(`/api/admin/station/${selectedStation._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete station');

      setStations(prev => prev.filter(s => s._id !== selectedStation._id));
      setSelectedStation(null);
      setActiveTab('stations');
      showToast('Station deleted successfully!', 'success');
    } catch (e) {
      console.error(e);
      showToast(e.message || 'Error deleting station', 'error');
    }
  };

  /* ---------------------------
     Render UI
     --------------------------- */
  if (userRole !== 'admin') return <div className={styles.loading}>Loading...</div>;

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>A</div>
            <span className={styles.userName}>Admin</span>
          </div>
        </div>

        <div className={styles.tabContainer}>
          <button
            className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab('overview'); setSelectedStation(null); }}
          >
            📊 Overview
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'stations' ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab('stations'); setSelectedStation(null); }}
          >
            📍 Stations
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'partners' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('partners')}
          >
            🤝 Partners
          </button>
        </div>

        <div className={styles.content}>
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className={styles.overviewGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📍</div>
                <div>
                  <div className={styles.statValue}>{stations.length}</div>
                  <div className={styles.statLabel}>Total Stations</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📦</div>
                <div>
                  <div className={styles.statValue}>{allBookings.length}</div>
                  <div className={styles.statLabel}>Total Bookings</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🔑</div>
                <div>
                  <div className={styles.statValue}>{allKeyHandovers.length}</div>
                  <div className={styles.statLabel}>Key Handovers</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>💰</div>
                <div>
                  <div className={styles.statValue}>
                    A${allBookings.reduce((sum, b) => sum + calculateBookingAmount(b), 0).toFixed(2)}
                  </div>
                  <div className={styles.statLabel}>Total Revenue</div>
                </div>
              </div>
            </div>
          )}

          {/* Stations List */}
          {activeTab === 'stations' && !selectedStation && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Manage Stations</h2>
                <button className={styles.addButton} onClick={() => setShowStationForm(!showStationForm)}>
                  {showStationForm ? '✕ Cancel' : '+ Add Station'}
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
                      <input className={styles.input} value={stationLatitude} onChange={(e) => setStationLatitude(e.target.value)} placeholder="Latitude (e.g., -33.86)" />
                      <input className={styles.input} value={stationLongitude} onChange={(e) => setStationLongitude(e.target.value)} placeholder="Longitude (e.g., 151.20)" />
                      <input className={styles.input} value={stationImages} onChange={(e) => setStationImages(e.target.value)} placeholder="Station images (optional) — comma separated URLs" />
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>🏦 Bank / Payout Details</h4>
                    <div className={styles.formGrid}>
                      <input className={`${styles.input} ${styles.fullWidth}`} value={stationBank.accountHolderName} onChange={(e) => handleStationBankChange('accountHolderName', e.target.value)} placeholder="Account Holder Name" />
                      <input className={`${styles.input} ${styles.fullWidth}`} value={stationBank.bankName} onChange={(e) => handleStationBankChange('bankName', e.target.value)} placeholder="Bank Name" />
                      <input className={styles.input} value={stationBank.bsb} onChange={(e) => handleStationBankChange('bsb', e.target.value)} placeholder="BSB (e.g., 062000)" maxLength={6} />
                      <input className={styles.input} value={stationBank.accountNumber} onChange={(e) => handleStationBankChange('accountNumber', e.target.value)} placeholder="Account Number" />
                      <input className={`${styles.input} ${styles.fullWidth}`} value={stationBank.payoutEmail} onChange={(e) => handleStationBankChange('payoutEmail', e.target.value)} placeholder="Payout Email (PayPal/Wise) — optional" />
                      <select className={`${styles.input} ${styles.fullWidth}`} value={stationBank.accountType} onChange={(e) => handleStationBankChange('accountType', e.target.value)}>
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
                              <button type="button" className={styles.applyAllButton} onClick={() => applyStationTimingToAllDays(day)}>Apply to All</button>
                            </div>
                            <label className={styles.checkboxLabel}>
                              <input type="checkbox" checked={stationTimings[day].closed} onChange={(e) => handleStationTimingChange(day, 'closed', e.target.checked)} className={styles.checkbox} />
                              Closed
                            </label>
                            {!stationTimings[day].closed && (
                              <div className={styles.timeInputs}>
                                <div className={styles.timeGroup}>
                                  <label className={styles.timeLabel}>Open:</label>
                                  <input type="time" className={styles.timeInput} value={stationTimings[day].open} onChange={(e) => handleStationTimingChange(day, 'open', e.target.value)} />
                                </div>
                                <div className={styles.timeGroup}>
                                  <label className={styles.timeLabel}>Close:</label>
                                  <input type="time" className={styles.timeInput} value={stationTimings[day].close} onChange={(e) => handleStationTimingChange(day, 'close', e.target.value)} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className={styles.submitButton}
                    onClick={handleCreateStation}
                    disabled={!isStationFormValid()}
                    title={!isStationFormValid() ? validateStationForm().message : 'Create station'}
                  >
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
                    <div key={station._id} className={styles.stationCard} onClick={() => { setSelectedStation(station); setActiveTab('stations'); }}>
                      <h3 className={styles.stationName}>{station.name}</h3>
                      <p className={styles.stationLocation}>{station.location}</p>
                      <div className={styles.stationStats}>
                        <span className={styles.statBadge}>📦 {allBookings.filter(b => b.stationId?._id === station._id).length}</span>
                        <span className={styles.statBadge}>🔑 {allKeyHandovers.filter(k => k.stationId?._id === station._id).length}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Station detail */}
          {activeTab === 'stations' && selectedStation && (
            <div>
              <button className={styles.backButton} onClick={() => setSelectedStation(null)}>← Back to Stations</button>

              <div className={styles.stationDetailHeader}>
                <h2 className={styles.stationDetailTitle}>{selectedStation.name}</h2>
                <p className={styles.stationDetailLocation}>{selectedStation.location}</p>
              </div>

              {/* Bookings/Keys toggles & lists */}
              <div className={styles.toggleContainer}>
                <button className={`${styles.toggleButton} ${activeView === 'bookings' ? styles.toggleActive : ''}`} onClick={() => setActiveView('bookings')}>
                  📦 Bookings ({filteredBookings.length})
                </button>
                <button className={`${styles.toggleButton} ${activeView === 'keys' ? styles.toggleActive : ''}`} onClick={() => setActiveView('keys')}>
                  🔑 Key Handovers ({filteredKeyHandovers.length})
                </button>
              </div>

              {activeView === 'bookings' && (
                <div>
                  {loadingBookings ? (
                    <div className={styles.emptyState}><p>Loading bookings...</p></div>
                  ) : bookingError ? (
                    <div className={styles.error}>{bookingError}</div>
                  ) : filteredBookings.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>📦</div>
                      <p className={styles.emptyText}>No bookings for this station</p>
                    </div>
                  ) : (
                    <div className={styles.monthlyContainer}>
                      {groupBookingsByMonth(filteredBookings).map(([month, weeks]) => {
                        const monthBookings = weeks.flatMap(([, weekData]) => weekData.bookings);
                        const monthTotal = calculateTotalAmount(monthBookings);
                        return (
                          <div key={month} className={styles.monthSection}>
                            <div className={styles.monthHeader}>
                              <span>{month}</span>
                              <span>{monthBookings.length} bookings • A${monthTotal.toFixed(2)}</span>
                            </div>
                            {weeks.map(([weekRange, weekData]) => {
                              const weekTotal = calculateTotalAmount(weekData.bookings);
                              return (
                                <div key={weekRange}>
                                  <div className={styles.weekHeader}>
                                    <span>{weekRange}</span>
                                    <span>{weekData.bookings.length} bookings • A${weekTotal.toFixed(2)}</span>
                                  </div>
                                  <div className={styles.listContainer}>
                                    {weekData.bookings.map((booking) => {
                                      const bookingAmount = calculateBookingAmount(booking);
                                      return (
                                        <div key={booking._id} className={styles.listCard}>
                                          <div className={styles.listCardHeader}>
                                            <strong>{booking.fullName}</strong>
                                            <span className={styles.amount}>A${bookingAmount.toFixed(2)}</span>
                                          </div>
                                          <div className={styles.listCardBody}>
                                            <p><strong>Email:</strong> {booking.email}</p>
                                            <p><strong>Phone:</strong> {booking.phone}</p>
                                            <p><strong>Drop-off:</strong> {booking.dropOffDate}</p>
                                            <p><strong>Pick-up:</strong> {booking.pickUpDate}</p>
                                            <p><strong>Luggage:</strong> {booking.luggageCount} bags</p>
                                            <p><strong>Payment ID:</strong> {booking.paymentId}</p>
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
                  )}
                </div>
              )}

              {activeView === 'keys' && (
                <div>
                  {loadingKeys ? (
                    <div className={styles.emptyState}><p>Loading key handovers...</p></div>
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
                                      <p><strong>Drop-off:</strong> {handover.dropOffPerson?.name} ({handover.dropOffPerson?.email || 'no email'})</p>
                                      <p><strong>Pick-up:</strong> {handover.pickUpPerson?.name} ({handover.pickUpPerson?.email || 'no email'})</p>
                                      <p><strong>Drop-off Date:</strong> {handover.dropOffDate}</p>
                                      <p><strong>Pick-up Date:</strong> {handover.pickUpDate}</p>
                                      <p><strong>Pickup Code:</strong> <code className={styles.code}>{handover.keyCode}</code></p>
                                      <p><strong>Payment ID:</strong> {handover.paymentId}</p>
                                      <p><strong>Status:</strong> <span className={styles.statusBadge}>{handover.status}</span></p>
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

              {/* ----------------------
                  BOTTOM: Edit & Delete
                  ---------------------- */}
              <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
                <button className={styles.updateButton} onClick={() => { setShowStationEditForm(true); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}>
                  ✎ Edit
                </button>
                <button className={styles.deleteButton} onClick={handleDeleteStation}>
                  🗑 Delete
                </button>
              </div>

              {/* Station EDIT form (appears below when Edit pressed) */}
              {showStationEditForm && (
                <div className={styles.formCard} style={{ marginTop: 20 }}>
                  <h3 className={styles.formTitle}>Edit Station — {selectedStation.name}</h3>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>📍 Basic Information</h4>
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={editStation.name} onChange={(e) => setEditStation(s => ({ ...s, name: e.target.value }))} placeholder="Station Name" />
                      <input className={styles.input} value={editStation.location} onChange={(e) => setEditStation(s => ({ ...s, location: e.target.value }))} placeholder="Station Location" />
                      <input className={styles.input} value={editStation.latitude} onChange={(e) => setEditStation(s => ({ ...s, latitude: e.target.value }))} placeholder="Latitude (e.g., -33.86)" />
                      <input className={styles.input} value={editStation.longitude} onChange={(e) => setEditStation(s => ({ ...s, longitude: e.target.value }))} placeholder="Longitude (e.g., 151.20)" />
                      <input className={styles.input} value={editStationImages} onChange={(e) => setEditStationImages(e.target.value)} placeholder="Station images (optional) — comma separated URLs" />
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>🏦 Bank / Payout Details</h4>
                    <div className={styles.formGrid}>
                      <input className={`${styles.input} ${styles.fullWidth}`} value={editStationBank.accountHolderName} onChange={(e) => handleEditStationBankChange('accountHolderName', e.target.value)} placeholder="Account Holder Name" />
                      <input className={`${styles.input} ${styles.fullWidth}`} value={editStationBank.bankName} onChange={(e) => handleEditStationBankChange('bankName', e.target.value)} placeholder="Bank Name" />
                      <input className={styles.input} value={editStationBank.bsb} onChange={(e) => handleEditStationBankChange('bsb', e.target.value)} placeholder="BSB (e.g., 062000)" maxLength={6} />
                      <input className={styles.input} value={editStationBank.accountNumber} onChange={(e) => handleEditStationBankChange('accountNumber', e.target.value)} placeholder="Account Number" />
                      <input className={`${styles.input} ${styles.fullWidth}`} value={editStationBank.payoutEmail} onChange={(e) => handleEditStationBankChange('payoutEmail', e.target.value)} placeholder="Payout Email (PayPal/Wise) — optional" />
                      <select className={`${styles.input} ${styles.fullWidth}`} value={editStationBank.accountType} onChange={(e) => handleEditStationBankChange('accountType', e.target.value)}>
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
                              <button type="button" className={styles.applyAllButton} onClick={() => applyEditTimingToAllDays(day)}>Apply to All</button>
                            </div>
                            <label className={styles.checkboxLabel}>
                              <input type="checkbox" checked={editStationTimings[day].closed} onChange={(e) => handleEditStationTimingChange(day, 'closed', e.target.checked)} className={styles.checkbox} />
                              Closed
                            </label>
                            {!editStationTimings[day].closed && (
                              <div className={styles.timeInputs}>
                                <div className={styles.timeGroup}>
                                  <label className={styles.timeLabel}>Open:</label>
                                  <input type="time" className={styles.timeInput} value={editStationTimings[day].open} onChange={(e) => handleEditStationTimingChange(day, 'open', e.target.value)} />
                                </div>
                                <div className={styles.timeGroup}>
                                  <label className={styles.timeLabel}>Close:</label>
                                  <input type="time" className={styles.timeInput} value={editStationTimings[day].close} onChange={(e) => handleEditStationTimingChange(day, 'close', e.target.value)} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.buttonGroup} style={{ marginTop: 12 }}>
                    <button className={styles.updateButton} onClick={handleSaveStationEdits}>Save Changes</button>
                    <button className={styles.deleteButton} onClick={() => { setShowStationEditForm(false); }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Partners tab */}
          {activeTab === 'partners' && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Manage Partners</h2>
                <div>
                  <button className={styles.addButton} onClick={() => {
                    setShowPartnerForm(prev => !prev);
                    setPartnerFormVisibleForEdit(false);
                    setEditingPartner(null);
                  }}>
                    {showPartnerForm ? '✕ Cancel' : '+ Add Partner'}
                  </button>
                </div>
              </div>

              {/* Create Partner Form */}
              {showPartnerForm && (
                <div className={styles.formCard}>
                  <h3 className={styles.formTitle}>Create New Partner</h3>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>🔐 Login Information</h4>
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={partnerInfo.username} onChange={(e) => handlePartnerField('username', e.target.value)} placeholder="Username" />
                      <input className={styles.input} type="password" value={partnerInfo.password} onChange={(e) => handlePartnerField('password', e.target.value)} placeholder="Password" />
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h4 className={styles.formSectionTitle}>🏢 Business Information</h4>
                    <div className={styles.formGrid}>
                      <input className={`${styles.input} ${styles.fullWidth}`} value={partnerInfo.email} onChange={(e) => handlePartnerField('email', e.target.value)} placeholder="Email" />
                      <input className={styles.input} value={partnerInfo.phone} onChange={(e) => handlePartnerField('phone', e.target.value)} placeholder="Phone" />
                      <select className={`${styles.input} ${styles.fullWidth}`} value={partnerInfo.stationId} onChange={(e) => handlePartnerField('stationId', e.target.value)}>
                        <option value="">Select Station</option>
                        {stations.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button className={styles.submitButton} onClick={handleCreatePartner}>Create Partner</button>
                </div>
              )}

              {/* Edit partner inline form */}
              {partnerFormVisibleForEdit && editingPartner && (
                <div className={styles.formCard}>
                  <h3 className={styles.formTitle}>Edit Partner</h3>
                  <div className={styles.formSection}>
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={editingPartner.username} onChange={(e) => setEditingPartner(p => ({ ...p, username: e.target.value }))} placeholder="Username" />
                      <input className={styles.input} type="password" value={editingPartner.password || ''} onChange={(e) => setEditingPartner(p => ({ ...p, password: e.target.value }))} placeholder="New password (leave blank to keep)" />
                      <input className={styles.input} value={editingPartner.email} onChange={(e) => setEditingPartner(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
                      <input className={styles.input} value={editingPartner.phone} onChange={(e) => setEditingPartner(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
                      <select className={`${styles.input} ${styles.fullWidth}`} value={editingPartner.assignedStation} onChange={(e) => setEditingPartner(p => ({ ...p, assignedStation: e.target.value }))}>
                        <option value="">Select Station</option>
                        {stations.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.buttonGroup}>
                    <button className={styles.updateButton} onClick={handleUpdatePartner}>Save Changes</button>
                    <button className={styles.deleteButton} onClick={() => { setEditingPartner(null); setPartnerFormVisibleForEdit(false); }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Partners list */}
              <div className={styles.listContainer}>
                {partners.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🤝</div>
                    <p className={styles.emptyText}>No partners yet. Create one using the button above.</p>
                  </div>
                ) : (
                  partners.map(partner => (
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
                        <p><strong>Phone:</strong> {partner.phone || '-'}</p>
                        <p><strong>Station:</strong> {partner.assignedStation?.name || 'Unassigned'}</p>
                        <p><strong>Created:</strong> {partner.createdAt ? new Date(partner.createdAt).toLocaleString() : '-'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast UI (inline styles) */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 9999,
            minWidth: 240,
            maxWidth: 420,
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
            color: '#fff',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background:
              toast.type === 'success' ? 'linear-gradient(90deg,#2ecc71,#27ae60)' :
              toast.type === 'error' ? 'linear-gradient(90deg,#f54e4e,#e03131)' :
              'linear-gradient(90deg,#f0ad4e,#ffcc00)'
          }}
        >
          <div style={{ fontSize: 18 }}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⛔' : 'ℹ️'}
          </div>
          <div style={{ fontSize: 14, lineHeight: '1.2' }}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
