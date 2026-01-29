// utils/qrGenerator.js
import QRCode from 'qrcode';

/**
 * Generate QR code as base64 data URL from booking reference
 * @param {string} bookingReference - The booking reference number
 * @returns {Promise<string>} Base64 data URL of QR code
 */
export async function generateQRCode(bookingReference) {
  try {
    // Generate QR code as data URL (base64)
    const qrCodeDataURL = await QRCode.toDataURL(bookingReference, {
      errorCorrectionLevel: 'H', // High error correction
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as buffer (for saving to file system if needed)
 * @param {string} bookingReference - The booking reference number
 * @returns {Promise<Buffer>} QR code as buffer
 */
export async function generateQRCodeBuffer(bookingReference) {
  try {
    const buffer = await QRCode.toBuffer(bookingReference, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 0.95,
      margin: 1,
      width: 300
    });

    return buffer;
  } catch (error) {
    console.error('QR Code buffer generation error:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}