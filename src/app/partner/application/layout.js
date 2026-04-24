// app/partner/application/layout.js
// ✅ USES COOKIES (SAME AS WEBSITE) - NO localStorage TOKEN

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
    if (pathname === '/partner/application/login') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });

        if (!response.ok) {
          router.push('/partner/application/login');
          return;
        }

        const data = await response.json();

        if (data.role !== 'partner') {
          router.push('/partner/application/login');
          return;
        }

        const username = localStorage.getItem('username') || data.username;
        setPartnerName(username || 'Partner');
        setIsLoading(false);

      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/partner/application/login');
      }
    };

    checkAuth();
  }, [pathname, router]);

  // PWA Install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
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

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      localStorage.removeItem('role');
      
      setPartnerName('');
      setIsLoading(true);
      
      window.location.href = '/partner/application/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/partner/application/login';
    }
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
          <meta name="theme-color" content="#0284C7" />
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
        <meta name="theme-color" content="#0284C7" />
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
                priority
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

          <button
            className={`${styles.navItem} ${pathname === '/partner/application/earnings' ? styles.navItemActive : ''}`}
            onClick={() => router.push('/partner/application/earnings')}
          >
            <span className={styles.navIcon}>💰</span>
            <span className={styles.navLabel}>Earnings</span>
          </button>
        </nav>
      </div>
    </>
  );
}