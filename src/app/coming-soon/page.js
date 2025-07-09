import '../../../public/ALL CSS/ComingSoon.css';
import Header from '../../components/Header';

export const metadata = {
  title: 'Coming Soon – Luggage Terminal',
  description: 'Exciting things are coming soon. Stay tuned for updates from Luggage Terminal.',
};

export default function ComingSoonPage() {
  return (
    <>
      <Header />
    <main className="soon-main">
      <div className="soon-container">
        <h1 className="soon-title">🚧 Coming Soon</h1>
        <p className="soon-text">
          We&apos;re working on something awesome. Luggage Terminal will be launching this page shortly!
        </p>
        <p className="soon-subtext">Stay tuned for updates or check back later.</p>
      </div>
    </main>
    </>
  );
}
