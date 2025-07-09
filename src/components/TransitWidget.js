"use client";

import React from "react";
import { FaSubway } from "react-icons/fa6";
import "../../public/ALL CSS/TransitWidget.css";

const TransitWidget = () => {
  return (
    <section className="transit-section">
      <div className="transit-intro">
        <h2 className="transit-main-heading">🚅Getting Here is Easy</h2>
        <p className="transit-subtext">
          Plan your trip using Melbourne’s official public transport planner.
        </p>
      </div>

      <div className="transit-card">
        <div className="transit-icon">
          <FaSubway size={32} />
        </div>
        <h3 className="transit-heading">Plan Your Journey</h3>
        <p className="transit-text">
          Use the journey planner to find trains, trams and buses to your nearest station.
        </p>
        <a
          href="https://www.ptv.vic.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          className="transit-link"
        >
          Open Transport Planner
        </a>
      </div>
    </section>
  );
};

export default TransitWidget;
