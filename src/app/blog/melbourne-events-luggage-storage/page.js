import Link from 'next/link';
import '../style.css';

export const metadata = {
  title: 'Where to Store Luggage During Melbourne Events – Grand Prix, NYE, MCG & More',
  description: 'Attending an event in Melbourne? Learn where to store your bags safely during Grand Prix, New Year’s Eve, concerts, and more.',
};

export default function MelbourneEventsBlog() {
  return (
    <main className="blog-main">
      <div className="blog-container">
        <h1 className="blog-title">🎉 Where to Store Luggage During Melbourne Events – Grand Prix, NYE, MCG & More</h1>

        <p className="blog-paragraph">
          Melbourne is buzzing with events year-round — from the adrenaline of the <strong>Australian Grand Prix</strong> to packed nights on <strong>New Year’s Eve</strong>, from concerts to cricket at the <strong>MCG</strong>. But there’s one thing that ruins all the fun: dragging your luggage around.
        </p>

        <h2 className="blog-heading">🧳 The Problem: Bags + Crowds = Chaos</h2>
        <p className="blog-paragraph">
          Event venues and public spaces often restrict large bags. Security checks, long queues, and lack of lockers make it worse.
        </p>

        <h2 className="blog-heading">✅ The Solution: Luggage Terminal</h2>
        <p className="blog-paragraph">
          Drop your bags at our nearby station and enjoy your event completely hands-free.
        </p>

        <ul className="blog-list">
          <li>🎤 Attending a concert at Rod Laver Arena? We’re close by.</li>
          <li>🏁 Grand Prix day? Store bags and head to the track worry-free.</li>
          <li>🎆 NYE fireworks? Explore all night without heavy backpacks.</li>
          <li>🏏 MCG matches? Avoid locker bans and crowd checks.</li>
        </ul>

        <h2 className="blog-heading">💼 What Kind of Bags Can I Store?</h2>
        <p className="blog-paragraph">
          Everything from:
          <ul className="blog-list">
            <li>Big suitcases</li>
            <li>Shopping bags</li>
            <li>Backpacks and sports gear</li>
          </ul>
        </p>

        <h2 className="blog-heading">🕒 Open All Event Days</h2>
        <p className="blog-paragraph">
          We’re open on weekends, holidays, and yes — even during midnight fireworks and finals. Book your spot early to avoid the rush.
        </p>

        <div className="blog-cta">
          <Link href="/" className="blog-button">
            👉 Book Luggage Storage Now for Your Event
          </Link>
        </div>

        <p className="blog-paragraph">
          Enjoy Melbourne’s best events, festivals, and matches — all without the baggage.
        </p>
      </div>
    </main>
  );
}
