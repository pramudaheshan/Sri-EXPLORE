const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force all imports of "three" to resolve to the same single copy.
// This prevents "THREE.WARNING: Multiple instances of Three.js being imported" in Expo.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  three: path.resolve(__dirname, 'node_modules/three'),
};

module.exports = config;
