/**
 * Parse token from QR payload URL
 * QR payload format: https://YOUR_API/auth/qr-scan?token=XYZ
 */
export const parseQRToken = (qrData: string): string | null => {
  try {
    // Check if it's a URL
    if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
      const url = new URL(qrData);
      const token = url.searchParams.get('token');
      return token;
    }
    
    // If it's just the token itself
    if (qrData.length > 20) {
      return qrData;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing QR token:', error);
    return null;
  }
};

/**
 * Validate QR payload format
 */
export const isValidQRPayload = (qrData: string): boolean => {
  try {
    if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
      const url = new URL(qrData);
      return url.pathname.includes('/auth/qr-scan') && url.searchParams.has('token');
    }
    // Accept plain token if it's long enough
    return qrData.length >= 20;
  } catch {
    return false;
  }
};

