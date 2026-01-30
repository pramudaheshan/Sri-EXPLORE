const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(
  __dirname,
  '../firebaseServiceAccountKey.json',
);

// Note: You need to download your service account key from Firebase Console
// 1. Go to Firebase Console -> Project Settings -> Service Accounts
// 2. Click "Generate New Private Key"
// 3. Save it as firebaseServiceAccountKey.json in the project root

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id.firebaseio.com',
  });
} catch (error) {
  console.error(
    '❌ Error: firebaseServiceAccountKey.json not found!',
    '\nSteps to fix:',
    '1. Go to Firebase Console -> Project Settings -> Service Accounts',
    '2. Click "Generate New Private Key"',
    '3. Save it as firebaseServiceAccountKey.json in the project root',
    '\nError details:',
    error.message,
  );
  process.exit(1);
}

const db = admin.firestore();

// Sample relic data
const relicsData = [
  {
    id: 'galle-lighthouse-001',
    name: 'Galle Lighthouse',
    description:
      'Historic lighthouse standing sentinel on the Galle harbor. An iconic beacon guiding ships with its distinctive architecture and coastal charm.',
    model3dUrl:
      'https://firebasestorage.googleapis.com/v0/b/sri-explore.firebasestorage.app/o/Galle-Lighthouse.glb?alt=media&token=7d94dc84-d13e-4f84-831a-418bd7e984ba',
    location: {
      latitude: 6.0535,
      longitude: 80.2158,
      name: 'Galle, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Foundation Base',
        description:
          'The sturdy foundation of the Galle Lighthouse, built to withstand centuries of coastal weather and crashing waves.',
        // Normalized positions: x/z range -1 to 1 around model, y range 0 to 1 (bottom to top)
        position: { x: 0.3, y: 0.1, z: 0.3 },
      },
      {
        id: 'hotspot-2',
        name: 'Lighthouse Gallery',
        description:
          'The observation gallery offering 360-degree panoramic views of Galle harbor and the Indian Ocean.',
        position: { x: -0.3, y: 0.7, z: 0.3 },
      },
      {
        id: 'hotspot-3',
        name: 'Beacon Light',
        description:
          'The iconic beacon light at the summit, guiding ships safely through the waters since 1848.',
        position: { x: 0, y: 0.95, z: 0.25 },
      },
    ],
    xpReward: 100,
    difficulty: 'Easy',
    tags: ['lighthouse', 'historic', 'coastal', 'maritime'],
    createdAt: admin.firestore.Timestamp.now(),
  },
];

async function setupRelicsCollection() {
  try {
    console.log('🚀 Starting Firebase Relics Collection Setup...\n');

    for (const relic of relicsData) {
      const { id, ...data } = relic;
      await db.collection('relics').doc(id).set(data);
      console.log(`✅ Created relic: ${relic.name}`);
    }

    console.log('\n✨ All relics created successfully!');
    console.log(`📊 Total relics: ${relicsData.length}`);
    console.log('\nYou can now scan QR codes with these relic IDs:');
    relicsData.forEach((relic) => {
      console.log(`  • ${relic.id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up relics:', error);
    process.exit(1);
  }
}

setupRelicsCollection();
