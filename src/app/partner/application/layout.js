// app/partner/application/layout.js
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import styles from './PartnerApp.module.css';
import Image from 'next/image';

export default function PartnerAppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [partnerName, setPartnerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    // Skip auth check on login page
    if (pathname === '/partner/application/login') {
      setIsLoading(false);
      return;
    }

    if (!token || role !== 'partner') {
      router.push('/partner/application/login');
      return;
    }

    // Get partner name from localStorage
    const username = localStorage.getItem('username');
    setPartnerName(username || 'Partner');
    setIsLoading(false);
  }, [pathname, router]);

  // PWA Install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default install prompt
      e.preventDefault();
      // Save the event for later use
      setDeferredPrompt(e);
      // Show our custom install button
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);


  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('✅ Service Worker registered:', registration.scope))
        .catch((error) => console.log('❌ Service Worker registration failed:', error));
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);

    // Clear the saved prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/partner/application/login');
  };

  // Show loading on protected pages
  if (isLoading && pathname !== '/partner/application/login') {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Don't show nav on login page
  if (pathname === '/partner/application/login') {
    return (
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
          <meta name="theme-color" content="#1a73e8" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="LT Partner" />
          <link rel="manifest" href="/partner-manifest.json" />
          <link rel="apple-touch-icon" href="/icon1.png" />
        </Head>
        {children}
      </>
    );
    
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#1a73e8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LT Partner" />
        <link rel="manifest" href="/partner-manifest.json" />
        <link rel="apple-touch-icon" href="/icon1.png" />
      </Head>

      <div className={styles.appContainer}>
        {/* Install Prompt Banner */}
        {showInstallPrompt && (
          <div className={styles.installBanner}>
            <div className={styles.installBannerContent}>
              <span>📱 Install Partner App</span>
              <div className={styles.installBannerButtons}>
                <button className={styles.installButton} onClick={handleInstallClick}>
                  Install
                </button>
                <button className={styles.dismissButton} onClick={() => setShowInstallPrompt(false)}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.logo}>
              <Image
                src="/images/latestLogo.png"
                alt="Luggage Terminal Partner"
                width={150}
                height={50}
              />
            </div>
            <div className={styles.headerRight}>
              <span className={styles.partnerName}>{partnerName}</span>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className={styles.bottomNav}>
          <button
            className={`${styles.navItem} ${pathname === '/partner/application/dashboard' ? styles.navItemActive : ''}`}
            onClick={() => router.push('/partner/application/dashboard')}
          >
            <span className={styles.navIcon}>🏠</span>
            <span className={styles.navLabel}>Home</span>
          </button>

          <button
            className={`${styles.navItem} ${pathname === '/partner/application/scan' ? styles.navItemActive : ''}`}
            onClick={() => router.push('/partner/application/scan')}
          >
            <span className={styles.navIcon}>📷</span>
            <span className={styles.navLabel}>Scan</span>
          </button>

          <button
            className={`${styles.navItem} ${pathname === '/partner/application/history' ? styles.navItemActive : ''}`}
            onClick={() => router.push('/partner/application/history')}
          >
            <span className={styles.navIcon}>📋</span>
            <span className={styles.navLabel}>History</span>
          </button>
        </nav>
      </div>
    </>
  );
}