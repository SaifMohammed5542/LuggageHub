import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import '../../public/ALL CSS/Footer.css'; // Ensure the CSS file is correctly referenced

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-logo">
          <Image src="/images/licon.png" alt="Company Logo" width={250} height={200} />
        </div>
      </div>
      
      <div className="footer-container">
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link href="/privacy-policy">Privacy Policy</Link></li>
            <li><Link href="/terms-of-service">Terms of Service</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/help">Help</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Contact Us</h3>
          <ul>
            <li>Email: <a href="mailto:contact@company.com">support@luggagestorageonline.com</a></li>
            {/* <li>Phone: <a href="tel:+1234567890">+1 234 567 890</a></li>
            <li>Address: 123 Main St, City, Country</li> */}
          </ul>
        </div>
        <div className="footer-section">
        <h3>Follow Us</h3>
        <ul>
          <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
          <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a></li>
        </ul>
      </div>
      </div>

      {/* <div className="footer-social">
        <h3>Follow Us</h3>
        <ul>
          <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
          <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a></li>
        </ul>
      </div> */}

      {/* <div className="footer-bottom">
        <p>&copy; 2025 Company Name. All rights reserved.</p>
      </div> */}
    </footer>
  );
};

export default Footer;
