# Sri-EXPLORE

Sri-EXPLORE is a Sri Lanka travel and cultural exploration app built with
Expo and React Native. It combines itinerary planning, gamified heritage
discovery, augmented-reality relic scanning, Firebase-backed user profiles,
and SriSafeSpot safety alerts in one mobile-first experience.

## Features

- **Home dashboard** for accessing the main travel, discovery, and safety
  experiences.
- **Sri-TripTuner** for generating personalized Sri Lankan travel itineraries
  based on traveler preferences.
- **Sri-Reveal** for discovering historic relics, scanning QR/AR experiences,
  viewing 3D models, earning XP, and tracking scan progress.
- **Sri-SafeSpot** for viewing safety incidents, weather alerts, danger zones,
  maps, and push notifications.
- **Firebase integration** for authentication, Firestore data, Firebase
  Storage assets, scan history, profiles, and safety reports.
- **Google Maps integration** for native map rendering and location-based
  features.
- **Web support** through Expo's Metro web bundler.

## Technology stack

- Expo SDK 54
- React Native 0.81
- React 19
- Expo Router 6
- TypeScript
- Firebase 12
- Firebase Admin SDK for local data setup scripts
- React Native Maps
- Expo Camera, Location, Notifications, Sensors, and File System
- FastAPI, pandas, scikit-learn, and saved ML data files for the itinerary
  backend

## Project structure

```text
.
├── app/                    # Expo Router screens and tab routes
├── components/             # Reusable UI components
├── config/                 # Environment/configuration helpers
├── hooks/                  # React and Firebase hooks
├── services/               # Firebase, weather, safety, notification, and storage services
├── assets/                 # Images, icons, QR codes, and 3D assets
├── iternary_backend/       # FastAPI itinerary-generation service
├── scripts/                # Local Firebase and QR-code setup scripts
├── app.config.js           # Dynamic Expo configuration
├── firebaseConfig.ts       # Native Firebase client configuration
├── firebaseConfig.web.ts   # Web Firebase client configuration
└── package.json
```

## Prerequisites

- Node.js 20 or newer
- npm
- A Firebase project with Authentication, Firestore, and Storage enabled
- A Google Maps API key for native map builds
- An OpenWeatherMap API key for weather alerts
- Python 3.10+ if running the itinerary backend

For Android development, install Android Studio and configure an emulator or
physical device. For iOS development, use macOS with Xcode installed.

## Installation

Clone the repository and install JavaScript dependencies:

```powershell
npm install
```

Create a local environment file from the template:

```powershell
Copy-Item .env.example .env
```

Fill in the Firebase, Google Maps, OpenWeatherMap, and itinerary API values in
`.env`. The `.env` file is ignored by Git and must not be committed.

### Environment variables

The client requires these variables:

```env
EXPO_PUBLIC_ITINERARY_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_OPENWEATHER_API_KEY=
```

`EXPO_PUBLIC_` values are embedded in the client bundle. They are not suitable
for private server credentials. Restrict public API keys in their provider
consoles by application, platform, API, and quota wherever possible.

The Firebase Admin setup script additionally uses:

```env
FIREBASE_SERVICE_ACCOUNT_JSON_B64=
FIREBASE_DATABASE_URL=
```

`FIREBASE_SERVICE_ACCOUNT_JSON_B64` must contain a base64-encoded Firebase
service-account JSON document. Never commit the original JSON file, its private
key, or the decoded value.

## Running the app

Start the Expo development server:

```powershell
npm run dev
```

From the Expo CLI, choose an available target or use a direct command:

```powershell
npm run android
npm run ios
npx expo start --web
```

Build a static web export:

```powershell
npm run build:web
```

## Running the itinerary backend

The itinerary screen calls the FastAPI service configured by
`EXPO_PUBLIC_ITINERARY_API_URL`.

From the backend directory, create or activate a Python environment and
install the required packages:

```powershell
Set-Location iternary_backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn pandas scikit-learn
```

Start the API:

```powershell
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

When testing on a physical device, `127.0.0.1` refers to the device itself.
Set `EXPO_PUBLIC_ITINERARY_API_URL` to the host computer's LAN IP address and
make sure the device and computer are on the same network.

## Firebase data setup

The local relic setup script uses Firebase Admin credentials from environment
variables:

```powershell
node --env-file=.env scripts/setup-firebase-relics.js
```

The service-account value is used only by this local Node.js script. Do not
import Firebase Admin SDK or service-account credentials into client-side Expo
code.

## Validation and troubleshooting

Validate that Expo can resolve the dynamic configuration and all config
plugins:

```powershell
npx expo config --type public --json
```

Check dependency compatibility with the installed Expo SDK:

```powershell
npx expo install --check
```

Run the configured lint command:

```powershell
npm run lint
```

If Expo reports that a plugin cannot be resolved, reinstall the dependency
using Expo's installer rather than selecting an arbitrary version:

```powershell
npx expo install expo-notifications expo-task-manager
```

If Firebase initialization reports missing environment variables, confirm that
`.env` exists in the repository root and contains all required
`EXPO_PUBLIC_FIREBASE_*` values. Restart the Expo server after changing
environment variables.

## Security notes

- Do not commit `.env`, Firebase service-account JSON files, private keys, or
  generated credential files.
- Rotate credentials immediately if they have ever been committed or shared.
- `EXPO_PUBLIC_*` variables are client-visible by design.
- Use backend endpoints for operations that require genuinely private
  credentials.
- Apply restrictive Firebase Authentication and Firestore/Storage security
  rules before production deployment.

## Current scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Expo development server |
| `npm run android` | Build and run the Android native project |
| `npm run ios` | Build and run the iOS native project |
| `npm run build:web` | Export the web application |
| `npm run lint` | Run Expo/ESLint validation |

## License

No license has been declared for this project yet. Add a license before
distributing the application or accepting external contributions.
