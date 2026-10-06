module.exports = {
  expo: {
    name: 'Sri-EXPLORE',
    slug: 'Sri-EXPLORE',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'sriexplore',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.sriexplore.app',
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      package: 'com.sriexplore.app',
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      'expo-asset',
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow Sri-AR to use your camera to discover ancient relics.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Sri-EXPLORE to use your location to find nearby historic sites.',
        },
      ],
      '@react-native-google-signin/google-signin',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#EF4444',
          sounds: [],
          androidMode: 'default',
          androidCollapsedTitle: 'SriSafeSpot Alert',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
