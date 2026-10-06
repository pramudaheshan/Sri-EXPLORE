# Firebase Relics Collection Setup

This guide helps you set up the Firebase Firestore collection for the AR scanning feature.

## Prerequisites

You need to have:

- Firebase project created (if not, create one at [firebase.google.com](https://firebase.google.com))
- Node.js installed
- Dependencies installed: `npm install`

## Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Base64-encode the downloaded JSON and add it to your local `.env` as `FIREBASE_SERVICE_ACCOUNT_JSON_B64`

⚠️ **Important**: Add this file to `.gitignore` - never commit service account keys!

```bash
echo "firebaseServiceAccountKey.json" >> .gitignore
```

## Step 2: Install Required Dependencies

```bash
npm install firebase-admin qrcode
```

## Step 3: Create Firebase Relics Collection

Run this command from your project root:

```bash
node --env-file=.env scripts/setup-firebase-relics.js
```

This will:

- Create a `relics` collection in Firestore
- Add 4 sample relics with all required data:
  - Sigiriya Rock Fortress
  - Temple of the Sacred Tooth
  - Polonnaruwa Ancient City
  - Anuradhapura Sacred City

Expected output:

```
✅ Created relic: Ancient Sigiriya Rock Fortress
✅ Created relic: Temple of the Sacred Tooth Relic
✅ Created relic: Polonnaruwa Ancient City
✅ Created relic: Anuradhapura Sacred City

✨ All relics created successfully!
📊 Total relics: 4
```

## Step 4: Generate QR Codes (Optional)

Generate scannable QR codes for the relics:

```bash
node scripts/generate-qr-codes.js
```

This will create PNG files in `assets/qrcodes/` that you can:

- Print and place at actual locations
- Display on museum screens
- Use in promotional materials

## Collection Structure

Your Firestore collection will have this structure:

```
relics/
├── sigiriya-001
│   ├── name: "Ancient Sigiriya Rock Fortress"
│   ├── description: "..."
│   ├── model3dUrl: "https://..."
│   ├── location: { latitude, longitude, name }
│   ├── hotspots: [{ id, name, description, position }]
│   ├── xpReward: 150
│   ├── difficulty: "Medium"
│   ├── tags: ["ancient", "fortress", ...]
│   └── createdAt: timestamp
├── temple-tooth-001
├── polonnaruwa-001
└── anuradhapura-001
```

## Adding Custom Relics

To add more relics, edit `scripts/setup-firebase-relics.js`:

```javascript
const relicsData = [
  {
    id: 'your-relic-id',
    name: 'Your Relic Name',
    description: 'Description...',
    model3dUrl: 'https://your-model-url.glb',
    location: {
      latitude: 7.9457,
      longitude: 80.7597,
      name: 'Location Name',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Hotspot Name',
        description: 'Hotspot description',
        position: { x: 0, y: 0, z: 0 },
      },
    ],
    xpReward: 100,
    difficulty: 'Easy|Medium|Hard',
    tags: ['tag1', 'tag2'],
    createdAt: admin.firestore.Timestamp.now(),
  },
];
```

Then run the setup script again.

## Testing the AR Scanner

1. Start your Expo app: `npx expo start`
2. Navigate to the **Sri-AR** tab
3. Allow camera permissions
4. Point camera at a QR code (from `assets/qrcodes/`)
5. App will fetch relic data and show AR interface

## Troubleshooting

### Error: "Firebase Admin credentials are missing or invalid"

- Download your service account key from Firebase Console
- Base64-encode it and set `FIREBASE_SERVICE_ACCOUNT_JSON_B64` in your local `.env`
- Set `FIREBASE_DATABASE_URL` in your local `.env`

### Error: "Permission denied" when creating documents

- Check your Firestore security rules in Firebase Console
- For development, you can use public rules (⚠️ change for production):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2027, 1, 1);
    }
  }
}
```

### QR codes not scanning

- Ensure QR code quality is good (not too small or blurry)
- Try printing at larger size (at least 2x2 inches)
- Check app has camera permissions

## What's Next?

1. Add your actual 3D models:
   - Host `.glb` files on a server
   - Update `model3dUrl` in relics data

2. Define hotspots with AR interactions:
   - Set correct 3D positions
   - Add interactive elements

3. Deploy to production:
   - Update Firebase security rules
   - Remove test data if needed
   - Test with real QR codes

## Commands Quick Reference

```bash
# Setup relics collection
node --env-file=.env scripts/setup-firebase-relics.js

# Generate QR codes
node scripts/generate-qr-codes.js

# Start app
npx expo start

# Both setup and QR codes
node --env-file=.env scripts/setup-firebase-relics.js && node scripts/generate-qr-codes.js
```
