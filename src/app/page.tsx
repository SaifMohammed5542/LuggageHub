"use client"
import React, { useRef } from 'react';
import "../../public/ALL CSS/Page.css"
import Header from '../components/Header.js';
import BannerOne from '../components/BannerOne.js';
import BannerTwo from '../components/BannerTwo.js';
import Cards from '../components/Cards.js';
import Cards2 from '../components/Cards2.js';
import Locations from '../components/Locations.js';
import GoogleMapsComponent from "../components/Map.js"
import Rotatingtext from '../components/Rotate.js';
import Banerrr from '../components/tesxt'
import Footer from '../components/Footer.js';
import Amount from '../components/Amount'
import FindLocHere from '../components/FindLocHere.js' 
import LuggageStorage from '../components/Leaflet'
import MapWithDirections from "../components/Map.js";
import MapButton from "../components/MapButton"

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
      <div className='Holder'>
      <Header scrollToServices={() => scrollToSection("services")} scrollTohowItWorks={() => scrollToSection("howItWorks")} />
      <BannerOne />
      </div>
      {/* <FindLocHere destination={"EzyMart, Melbourne"}/> */}
      {/* <MapButton /> */}
        <Rotatingtext />
      {/* <MapWithDirections origin="someOriginValue" /> */}
      <Cards2 howItWorksRef={howItWorksRef} />
      <Amount />
      <Locations />
      {/* <Banerrr /> */}
      <Cards servicesRef={servicesRef} />
      <BannerTwo />
      <Footer />
    </>
  );
}

export default App;
