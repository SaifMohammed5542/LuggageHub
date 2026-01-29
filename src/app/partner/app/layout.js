// app/partner/app/layout.js
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './PartnerApp.module.css';

export default function PartnerAppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [partnerName, setPartnerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    // Skip auth check on login page
    if (pathname === '/partner/app/login') {
      setIsLoading(false);
      return;
    }

    if (!token || role !== 'partner') {
      router.push('/partner/app/login');
      return;
    }

    // Get partner name from localStorage
    const username = localStorage.getItem('username');
    setPartnerName(username || 'Partner');
    setIsLoading(false);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/partner/app/login');
  };

  // Show loading on protected pages
  if (isLoading && pathname !== '/partner/app/login') {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Don't show nav on login page
  if (pathname === '/partner/app/login') {
    return <>{children}</>;
  }

  return (
    <div className={styles.appContainer}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>🧳 Luggage Terminal</h1>
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
          className={`${styles.navItem} ${pathname === '/partner/app/dashboard' ? styles.navItemActive : ''}`}
          onClick={() => router.push('/partner/app/dashboard')}
        >
          <span className={styles.navIcon}>🏠</span>
          <span className={styles.navLabel}>Home</span>
        </button>

        <button
          className={`${styles.navItem} ${pathname === '/partner/app/scan' ? styles.navItemActive : ''}`}
          onClick={() => router.push('/partner/app/scan')}
        >
          <span className={styles.navIcon}>📷</span>
          <span className={styles.navLabel}>Scan</span>
        </button>

        <button
          className={`${styles.navItem} ${pathname === '/partner/app/history' ? styles.navItemActive : ''}`}
          onClick={() => router.push('/partner/app/history')}
        >
          <span className={styles.navIcon}>📋</span>
          <span className={styles.navLabel}>History</span>
        </button>
      </nav>
    </div>
  );
}