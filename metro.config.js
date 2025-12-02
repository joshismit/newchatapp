// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for expo-modules-core web module registration
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'web.js', 'web.ts', 'web.tsx'];

// Add platform-specific resolution
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

module.exports = config;
