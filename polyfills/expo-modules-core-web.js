// Polyfill for expo-modules-core registerWebModule
// This must be loaded BEFORE any expo modules

(function() {
  'use strict';
  
  // Create global expo.modules.core if it doesn't exist
  if (typeof global !== 'undefined') {
    if (!global.expo) {
      global.expo = {};
    }
    if (!global.expo.modules) {
      global.expo.modules = {};
    }
    if (!global.expo.modules.core) {
      global.expo.modules.core = {
        registerWebModule: function() {
          // No-op: web modules registration handled by Metro
          return;
        }
      };
    }
  }
  
  // Also set on window for browser
  if (typeof window !== 'undefined') {
    if (!window.expo) {
      window.expo = {};
    }
    if (!window.expo.modules) {
      window.expo.modules = {};
    }
    if (!window.expo.modules.core) {
      window.expo.modules.core = {
        registerWebModule: function() {
          return;
        }
      };
    }
  }
})();
