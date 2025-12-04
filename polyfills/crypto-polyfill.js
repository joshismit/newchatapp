/**
 * Crypto Polyfill for React Native
 * Provides crypto.getRandomValues for nanoid and other libraries
 * Uses Math.random as fallback (works for non-cryptographic use cases like IDs)
 */

if (typeof global.crypto === 'undefined') {
  // Simple fallback using Math.random
  // Note: This is less secure than crypto.getRandomValues but works for ID generation
  const getRandomValues = (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
  
  global.crypto = {
    getRandomValues,
  };
  
  // Also set it on window for web compatibility
  if (typeof window !== 'undefined') {
    window.crypto = global.crypto;
  }
}

