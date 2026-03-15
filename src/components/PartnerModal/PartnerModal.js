//app/components/PartnerModal/PartnerModal.js
'use client';

// PartnerModal.jsx
// Usage: import PartnerModal from '@/components/PartnerModal';
//        <PartnerModal isOpen={open} onClose={() => setOpen(false)} />

import { useState, useEffect } from 'react';
import styles from './PartnerModal.module.css';

const BUSINESS_TYPES = [
  'Convenience Store',
  'Newsagency',
  'Hostel / Hotel',
  'Café / Restaurant',
  'Souvenir Shop',
  'Courier / Print Shop',
  'Clothing / Retail Store',
  'Other',
];

const INITIAL = {
  businessName: '',
  ownerName: '',
  suburb: '',
  phone: '',
  email: '',
  businessType: '',
};

export default function PartnerModal({ isOpen, onClose }) {
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => { setForm(INITIAL); setErrors({}); setSuccess(false); }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function validate() {
    const e = {};
    if (!form.businessName.trim()) e.businessName = 'Required';
    if (!form.ownerName.trim())    e.ownerName    = 'Required';
    if (!form.suburb.trim())       e.suburb       = 'Required';
    if (!form.phone.trim())        e.phone        = 'Required';
    if (!form.email.trim())        e.email        = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => ({ ...err, [name]: '' }));
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/partner-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Server error');
      setSuccess(true);
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Partner Application">

        {success ? (
          /* ── Success state ── */
          <div className={styles.success}>
            <div className={styles.successIcon}>🎉</div>
            <h2 className={styles.successTitle}>Application received!</h2>
            <p className={styles.successSub}>
              Thanks <strong>{form.ownerName}</strong>! We&apos;ve sent a confirmation to <strong>{form.email}</strong>.
              Our team will be in touch within 48 hours.
            </p>
            <div className={styles.successSteps}>
              {[
                'Application reviewed by our team',
                'We contact you to confirm details',
                'Station goes live — you start earning',
              ].map((step, i) => (
                <div key={i} className={styles.successStep}>
                  <span className={styles.successStepNum}>{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
            <button className={styles.closeSuccessBtn} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className={styles.header}>
              <div className={styles.headerText}>
                <div className={styles.headerPill}>
                  <span className={styles.headerPillDot} />
                  Partner Program · Australia
                </div>
                <h2 className={styles.headerTitle}>Apply to become a partner</h2>
                <p className={styles.headerSub}>2-minute form. We review within 48 hours.</p>
              </div>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
            </div>

            {/* ── Form ── */}
            <div className={styles.body}>
              <div className={styles.fieldGrid}>

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Business Name <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.businessName ? styles.inputError : ''}`}
                    name="businessName" value={form.businessName}
                    onChange={handleChange} placeholder="e.g. City Convenience Store"
                    autoComplete="organization"
                  />
                  {errors.businessName && <span className={styles.errorMsg}>{errors.businessName}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Your Name <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.ownerName ? styles.inputError : ''}`}
                    name="ownerName" value={form.ownerName}
                    onChange={handleChange} placeholder="Full name"
                    autoComplete="name"
                  />
                  {errors.ownerName && <span className={styles.errorMsg}>{errors.ownerName}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Suburb <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.suburb ? styles.inputError : ''}`}
                    name="suburb" value={form.suburb}
                    onChange={handleChange} placeholder="e.g. Melbourne CBD"
                  />
                  {errors.suburb && <span className={styles.errorMsg}>{errors.suburb}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Phone <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                    name="phone" value={form.phone}
                    onChange={handleChange} placeholder="04XX XXX XXX"
                    autoComplete="tel" type="tel"
                  />
                  {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
                </div>

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Email Address <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    name="email" value={form.email}
                    onChange={handleChange} placeholder="owner@yourbusiness.com.au"
                    autoComplete="email" type="email"
                  />
                  {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
                </div>

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Business Type</label>
                  <select
                    className={styles.select}
                    name="businessType" value={form.businessType}
                    onChange={handleChange}
                  >
                    <option value="">Select type (optional)</option>
                    {BUSINESS_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

              </div>

              {errors.submit && (
                <p style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: '0.75rem', textAlign: 'center' }}>
                  {errors.submit}
                </p>
              )}

              <p className={styles.privacy}>
                🔒 Your details are only used to set up your partner account. We never share your information.
              </p>

              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <><span className={styles.spinner} /> Submitting…</>
                ) : (
                  <>Apply Now — It&apos;s Free →</>
                )}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}