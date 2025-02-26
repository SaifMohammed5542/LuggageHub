// import React from 'react';
// import Header from '../components/Header.js'
// import BannerOne from '../components/BannerOne.js'
// import Cards from '../components/Cards.js'
// import Cards2 from '../components/Cards2.js'
// import Locations from '../components/Locations.js'
// import Rotatingtext from '../components/Rotate.js'
// import Footer from '../components/Footer.js';

// function App() {
//   return (
//     <>
//     <Header />
//     <BannerOne />
//     <Rotatingtext/>
//     <Cards2 />
//     <Locations />
//     <Cards />
//     {/* <LuggageBookingForm /> */}
//     <Footer />
//     </>
//   );
// }
// export default App;
"use client"
import React, { useRef } from 'react';
import Header from '../components/Header.js';
import BannerOne from '../components/BannerOne.js';
import Cards from '../components/Cards.js';
import Cards2 from '../components/Cards2.js';
import Locations from '../components/Locations.js';
import Rotatingtext from '../components/Rotate.js';
import Footer from '../components/Footer.js';

function App() {
  const servicesRef = useRef<HTMLDivElement>(null);

  const scrollToServices = () => {
    if (servicesRef.current) {
      servicesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <Header scrollToServices={scrollToServices} />
      <BannerOne />
      <Rotatingtext />
      <Cards2 />
      <Locations />
      <Cards servicesRef={servicesRef} />
      <Footer />
    </>
  );
}

export default App;
