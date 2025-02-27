"use client"
import React, { useRef } from 'react';
import Header from '../components/Header.js';
import BannerOne from '../components/BannerOne.js';
import BannerTwo from '../components/BannerTwo.js';
import Cards from '../components/Cards.js';
import Cards2 from '../components/Cards2.js';
import Locations from '../components/Locations.js';
import Rotatingtext from '../components/Rotate.js';
import Footer from '../components/Footer.js';

function App() {
  const servicesRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (section: "services" | "howItWorks") => {
    const ref = section === "services" ? servicesRef : howItWorksRef;
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <Header scrollToServices={() => scrollToSection("services")} scrollTohowItWorks={() => scrollToSection("howItWorks")} />
      <BannerOne />
        <Rotatingtext />
      <Cards2 howItWorksRef={howItWorksRef} />
      <Locations />
      <Cards servicesRef={servicesRef} />
      <BannerTwo />
      <Footer />
    </>
  );
}

export default App;
