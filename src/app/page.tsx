"use client"
import React, { useRef, useEffect, useState } from 'react';
import Head from 'next/head';
import "../../public/ALL CSS/Page.css"
import Header from '@/components/Header';
import Banner from '@/components/Banner';
import Amount from '@/components/Amount';
import HowItWorks from '@/components/HowItWorks';
import Testimonials from '@/components/Testimonials';
import OurTopServices from '@/components/OurTopServices';
import Queries from '@/components/Queries';
import Footer from '@/components/Footer';
import Trustpilot from '@/components/Trustpilot';
import Rotatingtext from '@/components/Rotator';
// import BannerTwo from '../components/BannerTwo.js';
// import Locations from '../components/Locations.js';
// import GoogleMapsComponent from "../components/Map.js"
// import Banerrr from '../components/tesxt'
// import FindLocHere from '../components/FindLocHere.js' 
// import LuggageStorage from '../components/Leaflet'
// import MapWithDirections from "../components/Map.js";
// import MapButton from "../components/MapButton"
import Loader from '../components/Loader'; // ✅ Import your Loader
// import TransitWidget from '../components/TransitWidget'; // ✅ Import TransitWidget
import WhatsAppFloating from "../components/WhatsAppFloating" // WhatsApp Floating Button;


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

  // ---------- ADD THIS (one-time hash handler) ----------
useEffect(() => {
  if (typeof window === "undefined") return;

  const hash = window.location.hash.replace("#", ""); // e.g. "services" or "how-it-works"
  if (!hash) return;

  const t = setTimeout(() => {
    if (hash === "services") {
      scrollToSection("services");
    } else if (
      hash === "how-it-works" ||
      hash === "howItWorks" ||
      hash === "howitworks"
    ) {
      scrollToSection("howItWorks");
    } else {
      // fallback: try ID-based scroll
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, 100); // small delay so refs mount & layout stabilises

  return () => clearTimeout(t);
}, []); 
// ---------- END ADDITION ----------


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
          content="luggage storage online, luggage, booking,luggage terminal, luggage booking, luggage storage australia, luggage terminal melbourne, luggage storage melbourne, luggage storage Southern cross, luggage storage Southern cross station, secure luggage storage, travel storage solutions, baggage storage services"
        />
        <meta
          name="description"
          content="Find reliable and secure luggage storage in Australia, including Melbourne. Book online and store your bags safely while you travel."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Head>

<script type="text/javascript" src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" async></script>

      </Head>

      <Head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
          rel="stylesheet"
          />
      </Head>


      <div className='Holder'>
        <Header scrollToServices={() => scrollToSection("services")} scrollTohowItWorks={() => scrollToSection("howItWorks")} />
        <Banner />
      </div>

      {/* Other Components */}
      <Rotatingtext />
      {/* <TransitWidget /> */}
      <Amount />
      <br />
      <HowItWorks howItWorksRef={howItWorksRef} />
      <br />
      <WhatsAppFloating />
      {/* <Locations /> */}
      <Testimonials />
      <br />
      <Trustpilot />
      <br />
      <OurTopServices servicesRef={servicesRef} />
      <br />
      <Queries />
      <br />
      <Footer />
    </>
  );
}

export default App;
