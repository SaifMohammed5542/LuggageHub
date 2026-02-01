// app/partner/app/login/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Login.module.css';

export default function PartnerLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Capture the install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  

const handleInstall = async () => {
    if (!deferredPrompt) {
      // Show instructions for iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        alert('To install on iOS:\n\n1. Tap the Share button (⬆️)\n2. Scroll down\n3. Tap "Add to Home Screen"\n4. Tap "Add"');
      } else {
        alert('To install:\n\n1. Tap menu (⋮)\n2. Tap "Install app" or "Add to Home Screen"');
      }
      return;
    }

    // Android/Chrome automatic install
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Install outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.role !== 'partner') {
        throw new Error('Access denied. Partners only.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', data.username || data.email);

      console.log('✅ Partner login successful');
      router.push('/partner/app/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.logoSection}>
          <h1 className={styles.logo}>🧳</h1>
          <h2 className={styles.title}>Partner Login</h2>
          <p className={styles.subtitle}>Luggage Terminal</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorBox}>
              ❌ {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className={styles.input}
              placeholder="partner@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className={styles.input}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.buttonSpinner}></span>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* ✅ ADD INSTALL BUTTON HERE */}
        {isInstallable && (
          <div className={styles.installSection}>
            <button
              type="button"
              className={styles.installButton}
              onClick={handleInstall}
            >
              📱 Install App
            </button>
          </div>
        )}

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Partner access only • For support, contact admin
          </p>
        </div>
      </div>
    </div>
  );
}