"use client"
import React, { useRef, useEffect, useState } from 'react';
import Head from 'next/head';
import "../../public/ALL CSS/Page.css"
import Header from '../components/Header.js';
import BannerOne from '../components/BannerOne.js';
// import BannerTwo from '../components/BannerTwo.js';
import Cards from '../components/Cards.js';
import Cards2 from '../components/Cards2.js';
import Locations from '../components/Locations.js';
// import GoogleMapsComponent from "../components/Map.js"
import Rotatingtext from '../components/Rotate.js';
import ConBanner from '../components/Cons'
// import Banerrr from '../components/tesxt'
import Footer from '../components/Footer.js';
import Amount from '../components/Amount'
// import FindLocHere from '../components/FindLocHere.js' 
// import LuggageStorage from '../components/Leaflet'
// import MapWithDirections from "../components/Map.js";
// import MapButton from "../components/MapButton"
import Loader from '../components/Loader'; // ✅ Import your Loader
import Testimonials from '../components/testimonials'; // ✅ Import Testimonials if needed


function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const handleLoad = () => {
      setLoading(false);
    };

    if (document.readyState === "complete") {
      setLoading(false);
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  const servicesRef = useRef<HTMLDivElement | null>(null);
  const howItWorksRef = useRef<HTMLDivElement | null>(null);

  interface ScrollToSectionProps {
    section: "services" | "howItWorks";
  }

  const scrollToSection = (section: ScrollToSectionProps["section"]) => {
    const ref = section === "services" ? servicesRef : howItWorksRef;
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return <Loader visible={loading} />;  // ✅ Show Loader while loading
  }

  return (
    <>
      <Head>
        <title>Luggage Terminal | Safe & Secure in Australia</title>
        <meta
          name="keywords"
          content="luggage storage online, luggage, booking,luggage terminal, luggage booking, luggage storage australia, luggage storage melbourne, secure luggage storage, travel storage solutions, baggage storage services"
        />
        <meta
          name="description"
          content="Find reliable and secure luggage storage in Australia, including Melbourne. Book online and store your bags safely while you travel."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
          rel="stylesheet"
          />
      </Head>
      <Head>
        <link rel="icon" type="image/png" href="%PUBLIC_URL%/favicon-96x96.png" sizes="96x96" />
<link rel="icon" type="image/svg+xml" href="%PUBLIC_URL%/favicon.svg" />
<link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="%PUBLIC_URL%/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-title" content="MyWebSite" />
<link rel="manifest" href="%PUBLIC_URL%/site.webmanifest" />
      </Head>


      <div className='Holder'>
        <Header scrollToServices={() => scrollToSection("services")} scrollTohowItWorks={() => scrollToSection("howItWorks")} />
        <BannerOne />
      </div>

      {/* Other Components */}
      <Rotatingtext />
      <Amount />
      <Cards2 howItWorksRef={howItWorksRef} />
      <Locations />
      <Testimonials />
      <Cards servicesRef={servicesRef} />
      <ConBanner />
      <Footer />
    </>
  );
}

export default App;
