const requiredPublicEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const environment = {
  firebase: {
    apiKey: requiredPublicEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: requiredPublicEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: requiredPublicEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: requiredPublicEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requiredPublicEnv(
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    ),
    appId: requiredPublicEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
  openWeatherApiKey: requiredPublicEnv('EXPO_PUBLIC_OPENWEATHER_API_KEY'),
};
