// lib/gtag.js
export const GA_MEASUREMENT_ID = 'G-27TV1KMWWH';
export const AW_CONVERSION_ID = 'AW-17821617933';
export const AW_CONVERSION_LABEL = 'IIfECMvR95McEI2egbJC';

// Track page views
export const pageview = (url) => {
  if (typeof window === 'undefined') return;
  window.gtag('config', GA_MEASUREMENT_ID, { page_path: url });
};

// Track booking conversion — fires on /booked page
export const trackBookingConversion = ({ value, transactionId }) => {
  if (typeof window === 'undefined') return;

  // Google Ads conversion
  window.gtag('event', 'conversion', {
    send_to: `${AW_CONVERSION_ID}/${AW_CONVERSION_LABEL}`,
    value: value || 15.0,
    currency: 'AUD',
    transaction_id: transactionId || '',
  });

  // GA4 purchase event
  window.gtag('event', 'purchase', {
    transaction_id: transactionId || '',
    value: value || 15.0,
    currency: 'AUD',
  });
};