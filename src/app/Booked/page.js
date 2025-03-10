"use client"
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const Map = dynamic(() => import('../../components/Leaflet'), { ssr: false });

const Home = () => {
  const [searchQuery, setSearchQuery] = useState(''); // State for search input

  const handleSearch = () => {
    if (searchQuery.trim() !== '') {
      console.log('Searching for:', searchQuery);
      // Add logic to display results or update the map based on the search query
    } else {
      alert('Please enter a valid location');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Find Luggage Storage</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault(); // Prevent page reload on form submission
          handleSearch();
        }}
        style={{ marginBottom: '20px' }}
      >
        <input
          type="text"
          placeholder="Enter location"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} // Update state on input change
          style={{ marginRight: '10px', padding: '5px', width: '60%' }}
        />
        <button
          type="submit"
          style={{ padding: '5px', backgroundColor: '#0070f3', color: 'white', border: 'none' }}
        >
          Search
        </button>
      </form>
      <p>No stores available around you. We are expanding rapidly!</p>
      <Map />
    </div>
  );
};

export default Home;