"use client";
import { useEffect, useState } from "react";
import dynamic from 'next/dynamic';

const BookedConfirmation = dynamic(() => import('@/components/BookedConfirmation/BookedConfirmation.js'), {
  ssr: false
});

const Booked = () => {
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    // Get booking data from sessionStorage or localStorage
    const booking = sessionStorage.getItem('lastBooking');
    if (booking) {
      setBookingData(JSON.parse(booking));
    }
  }, []);

  return <BookedConfirmation bookingData={bookingData} />;
};

export default Booked;