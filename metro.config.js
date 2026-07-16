const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force all imports of "three" to resolve to the same single copy.
// This prevents "THREE.WARNING: Multiple instances of Three.js being imported" in Expo.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  three: path.resolve(__dirname, 'node_modules/three'),
};

// Stub react-native-maps on web so the bundler doesn't crash
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'stubs/react-native-maps.web.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
