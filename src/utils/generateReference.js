// utils/generateReference.js
// Helper functions to generate unique reference numbers

import crypto from 'crypto';

/**
 * Generate a unique booking reference
 * Format: BK-YYYYMMDD-XXXX
 * Example: BK-20260111-A7X9
 */
export function generateBookingReference() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Generate 4 random alphanumeric characters
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `BK-${year}${month}${day}-${randomPart}`;
}

/**
 * Generate a unique payment reference
 * Format: PAY-YYYYMMDD-XXXX
 * Example: PAY-20260111-B3M8
 */
export function generatePaymentReference() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Generate 4 random alphanumeric characters
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `PAY-${year}${month}${day}-${randomPart}`;
}

/**
 * Validate reference format
 */
export function isValidBookingReference(reference) {
  return /^BK-\d{8}-[A-F0-9]{4}$/.test(reference);
}

export function isValidPaymentReference(reference) {
  return /^PAY-\d{8}-[A-F0-9]{4}$/.test(reference);
}