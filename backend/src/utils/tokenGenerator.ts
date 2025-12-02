import { customAlphabet } from 'nanoid';

// Generate random token for QR challenges (alphanumeric, 32 chars)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateToken = customAlphabet(alphabet, 32);

export const generateQRToken = (): string => {
  return generateToken();
};

