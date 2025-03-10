import React from 'react';
import '../../public/ALL CSS/tesxt.css'; // Import the CSS file for styling

const Bannerrr = () => {
    return (
        <div className="banner">
            <div className="banner-content">
                <h1>SPIDERWEB</h1>
                <p>WWW.SPIDERWEB.COM</p>
                <div className="support-center">
                    <p>FAIR SUPPORT CENTER</p>
                </div>
                <div className="business-enrich">
                    <p>FURBER ENRICH HARD BUSINESS</p>
                </div>
                <div className="cta">
                    <p>GETUP & RUNNING IN MINUTES</p>
                    <button>START YOUR 3 MONTH FREE</button>
                    <p>JUNE-DECEMBER 2020 ONLY</p>
                </div>
                <div className="hosting-options">
                    <p>SHARED HOSTING</p>
                    <p>RESELLER HOSTING</p>
                    <p>VPS HOSTING</p>
                    <p>DEDICATED SERVER</p>
                </div>
                <div className="trial">
                    <p>60 DAYS</p>
                    <button>REDEEM NOW</button>
                    <p>FREE TRIAL</p>
                </div>
            </div>
        </div>
    );
};

export default Bannerrr;