import Link from 'next/link';
import '../style.css';

export const metadata = {
  title: 'Luggage Storage Near Southern Cross Station – Travel Light & Explore Freely',
  description: 'Looking for luggage storage near Southern Cross Station in Melbourne? Discover secure, affordable bag storage and explore hands-free with Luggage Terminal.',
};

export default function SouthernCrossBlog() {
  return (
    <main className="blog-main">
      <div className="blog-container">
        <h1 className="blog-title">🧳 Luggage Storage Near Southern Cross Station – Travel Light & Explore Freely</h1>

        <p className="blog-paragraph">
          Heading through <strong>Southern Cross Station</strong> in Melbourne? Whether you're arriving early, checking out of your hotel, or just killing time before your next trip — carrying your luggage around the city is the last thing you want to do.
        </p>

        <h2 className="blog-heading">🚉 Why Southern Cross Station is the Perfect Spot for Luggage Drop</h2>
        <p className="blog-paragraph">
          As Melbourne’s busiest train and SkyBus hub, <strong>Southern Cross</strong> connects you to the airport, trams, regional trains, and the entire CBD. But with all that convenience comes crowds, movement — and a need to travel light.
        </p>

        <h2 className="blog-heading">✅ Store Bags Nearby with Luggage Terminal</h2>
        <p className="blog-paragraph">
          We’re just minutes from <strong>Southern Cross Melbourne</strong>, offering a secure, human-managed luggage storage service. Whether it’s a small backpack or a full-size suitcase, we’ve got space for it all.
        </p>

        <ul className="blog-list">
          <li>✔️ Checked out early from your Airbnb? Drop your bags.</li>
          <li>✔️ Got hours before your SkyBus to MEL Airport? Store and relax.</li>
          <li>✔️ Want to explore the city hands-free? We’re right here.</li>
        </ul>

        <h2 className="blog-heading">💼 What Can You Store?</h2>
        <p className="blog-paragraph">
          At Luggage Terminal, we accept:
        </p>
        <ul className="blog-list">
          <li>🧳 Cabin bags and suitcases</li>
          <li>🛍️ Shopping bags from Queen Vic or Bourke Street</li>
          <li>🎒 Backpacks, gear, and more</li>
        </ul>

        <h2 className="blog-heading">🕒 Open Daily, Easy to Access</h2>
        <p className="blog-paragraph">
          We’re open every day of the week — including weekends and holidays — with convenient hours to match your travel plans. No rush. No stress.
        </p>

        <h2 className="blog-heading">💰 Simple Pricing</h2>
        <p className="blog-paragraph">
          Our rates are straightforward: <strong>just pay per item, per day</strong>. No hourly meters, no hidden fees, no locker hassles.
        </p>

        <div className="blog-cta">
          <Link href="/" className="blog-button">
            👉 Book Luggage Storage Near Southern Cross
          </Link>
        </div>

        <p className="blog-paragraph">
          Whether you're heading to Docklands, Federation Square, or just grabbing a bite before your flight — leave your bags with <strong>Luggage Terminal</strong> and enjoy <strong>Southern Cross Melbourne</strong> the right way: hands-free.
        </p>
      </div>
    </main>
  );
}
