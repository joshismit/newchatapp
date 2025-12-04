/**
 * Parse token from QR payload
 * QR payload format: UUID token (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * Also supports legacy URL format for backward compatibility
 */
export const parseQRToken = (qrData: string): string | null => {
  try {
    // Check if it's a URL (legacy format)
    if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
      const url = new URL(qrData);
      const token = url.searchParams.get('token');
      return token;
    }
    
    // UUID format: 36 chars with hyphens (e.g., "550e8400-e29b-41d4-a716-446655440000")
    // Or 32 chars without hyphens
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuidWithoutHyphensPattern = /^[0-9a-f]{32}$/i;
    
    if (uuidPattern.test(qrData) || uuidWithoutHyphensPattern.test(qrData)) {
      return qrData;
    }
    
    // Fallback: if it's a long string (for backward compatibility)
    if (qrData.length >= 20) {
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
 * Accepts UUID format (with or without hyphens)
 */
export const isValidQRPayload = (qrData: string): boolean => {
  try {
    // Legacy URL format
    if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
      const url = new URL(qrData);
      return url.pathname.includes('/auth/qr-scan') && url.searchParams.has('token');
    }
    
    // UUID format validation
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuidWithoutHyphensPattern = /^[0-9a-f]{32}$/i;
    
    if (uuidPattern.test(qrData) || uuidWithoutHyphensPattern.test(qrData)) {
      return true;
    }
    
    // Fallback: accept long strings (backward compatibility)
    return qrData.length >= 20;
  } catch {
    return false;
  }
};

