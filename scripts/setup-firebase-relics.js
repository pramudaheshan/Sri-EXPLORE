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
    id: 'galle-001',
    name: 'Galle Lighthouse',
    description:
      'Historic lighthouse standing sentinel on the Galle harbor. An iconic beacon guiding ships with its distinctive architecture and coastal charm.',
    model3dPath: 'Galle-Lighthouse.glb',
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
  {
    id: 'galle-002',
    name: 'Galle Clocktower',
    description:
      "The iconic Galle Clocktower, a prominent landmark in the historic Galle area. Built with traditional architecture, it has been marking time for generations and stands as a symbol of the region's heritage.",
    model3dPath: 'Galle-Clocktower.glb',
    location: {
      latitude: 6.0545,
      longitude: 80.2165,
      name: 'Galle, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Clock Face',
        description:
          'The ornate clock face displaying intricate craftsmanship and precision engineering from a bygone era.',
        position: { x: 0, y: 0.8, z: 0.2 },
      },
      {
        id: 'hotspot-2',
        name: 'Tower Bell',
        description:
          'The grand bell mechanism housed within the tower, responsible for the melodious chimes that echo through the town.',
        position: { x: 0, y: 0.6, z: 0.1 },
      },
      {
        id: 'hotspot-3',
        name: 'Stone Base',
        description:
          'The sturdy stone foundation and architectural details that have weathered centuries of coastal climate.',
        position: { x: 0.25, y: 0.05, z: 0.15 },
      },
    ],
    xpReward: 120,
    difficulty: 'Medium',
    tags: ['clocktower', 'historic', 'architecture', 'monument'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-003',
    name: 'All Saints Church',
    description:
      'Rock-hewn Anglican church built in 1871 within Galle Fort, showcasing Gothic Revival architecture with solid granite construction.',
    model3dPath: 'Galle-All-Saints-Church.glb',
    location: {
      latitude: 6.02722,
      longitude: 80.21722,
      name: 'Galle Fort, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Nave Vaulting',
        description:
          'High timber-vaulted ceiling providing acoustic perfection for hymns.',
        position: { x: 0, y: 0.9, z: 0.1 },
      },
      {
        id: 'hotspot-2',
        name: 'Chancel Arch',
        description: 'Pointed Gothic arch separating nave from chancel area.',
        position: { x: 0.2, y: 0.6, z: 0.25 },
      },
      {
        id: 'hotspot-3',
        name: 'Rock Facade',
        description:
          'Original rock-cut entrance showcasing quarry craftsmanship.',
        position: { x: -0.3, y: 0.2, z: 0.4 },
      },
    ],
    xpReward: 135,
    difficulty: 'Medium',
    tags: ['church', 'gothic', 'anglican', 'rock-hewn'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-004',
    name: 'Colonial Anchor',
    description:
      '18th-century admiralty pattern anchor recovered from Galle harbor shipwrecks, weighing over 2 tons.',
    model3dPath: 'Galle-Colonial-Anchor.glb',
    location: {
      latitude: 6.0275,
      longitude: 80.214,
      name: 'National Maritime Museum, Galle Fort, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Crown',
        description: 'Pointed tip for seabed penetration through mud.',
        position: { x: 0, y: 0.05, z: 0.3 },
      },
      {
        id: 'hotspot-2',
        name: 'Shank Markings',
        description: 'Foundry marks identifying Dutch ship origin.',
        position: { x: 0, y: 0.5, z: 0 },
      },
      {
        id: 'hotspot-3',
        name: 'Ring Shackle',
        description: 'Heavy iron ring connecting to anchor chain.',
        position: { x: 0, y: 0.95, z: 0.1 },
      },
    ],
    xpReward: 110,
    difficulty: 'Easy',
    tags: ['anchor', 'maritime', 'shipwreck', 'artifact'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-005',
    name: 'Dutch Reformed Church',
    description:
      '1755 Protestant church in Galle Fort with floor-embedded Dutch tombstones and colonial pulpit.',
    model3dPath: 'Galle-Dutch-Reformed-Church.glb',
    location: {
      latitude: 6.0267,
      longitude: 80.215,
      name: 'Galle Fort, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Pulpit Canopy',
        description: "Hand-carved sounding board above preacher's platform.",
        position: { x: 0.1, y: 0.65, z: 0.25 },
      },
      {
        id: 'hotspot-2',
        name: 'Tombstone Floor',
        description: 'Gravestones repurposed as flooring tiles.',
        position: { x: -0.4, y: 0.1, z: 0.3 },
      },
      {
        id: 'hotspot-3',
        name: 'Organ Gallery',
        description: 'Balcony housing original pipe organ.',
        position: { x: 0.3, y: 0.85, z: 0.2 },
      },
    ],
    xpReward: 140,
    difficulty: 'Medium',
    tags: ['church', 'dutch', 'colonial', 'protestant'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-006',
    name: 'Dutch Tombstone',
    description:
      '17th-century gravestone embedded in church floor with skull carvings and Dutch family inscriptions.',
    model3dPath: 'Galle-Dutch-Tombstone.glb',
    location: {
      latitude: 6.0267,
      longitude: 80.215,
      name: 'Dutch Reformed Church, Galle Fort, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: "Death's Head",
        description: 'Memento mori skull emblem common in Dutch graves.',
        position: { x: 0, y: 0.75, z: 0.1 },
      },
      {
        id: 'hotspot-2',
        name: 'Inscription Panel',
        description: 'Names, dates, and family crests engraved.',
        position: { x: -0.3, y: 0.45, z: 0.2 },
      },
      {
        id: 'hotspot-3',
        name: 'Hourglass Motif',
        description: 'Sand timer symbolizing fleeting life.',
        position: { x: 0.35, y: 0.25, z: 0 },
      },
    ],
    xpReward: 125,
    difficulty: 'Easy',
    tags: ['tombstone', 'dutch', 'grave', 'memento-mori'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-007',
    name: 'Meeran Jumma Mosque',
    description:
      '1904 Baroque-style mosque blending Dutch and Moorish architecture in Galle Fort.',
    model3dPath: 'Galle-Meeran-Jumma-Mosque.glb',
    location: {
      latitude: 6.024639,
      longitude: 80.218694,
      name: 'Galle Fort, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Minaret Gallery',
        description: 'Spiral staircase leading to muezzin calling platform.',
        position: { x: 0.45, y: 0.9, z: 0.15 },
      },
      {
        id: 'hotspot-2',
        name: 'Mihrab Niche',
        description: 'Qibla wall indicating Mecca direction.',
        position: { x: 0, y: 0.55, z: 0.35 },
      },
      {
        id: 'hotspot-3',
        name: 'Dome Finial',
        description: 'Crescent moon atop main dome.',
        position: { x: 0, y: 0.95, z: 0 },
      },
    ],
    xpReward: 145,
    difficulty: 'Medium',
    tags: ['mosque', 'baroque', 'moorish', 'islamic'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-008',
    name: 'National Maritime Museum',
    description:
      "Museum housing Galle's naval history in a converted Dutch prison building.",
    model3dPath: 'Galle-National-Maritime-Museum.glb',
    location: {
      latitude: 6.0275,
      longitude: 80.214,
      name: "Queen's Street, Galle Fort, Southern Province",
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Ship Model Gallery',
        description: 'Scale models of VOC trading ships.',
        position: { x: -0.3, y: 0.6, z: 0.2 },
      },
      {
        id: 'hotspot-2',
        name: 'Cannon Exhibit',
        description: 'Bronze cannons from fort ramparts.',
        position: { x: 0.4, y: 0.3, z: 0.1 },
      },
      {
        id: 'hotspot-3',
        name: 'Prison Cells',
        description: 'Original Dutch jail cells now display areas.',
        position: { x: 0.2, y: 0.15, z: -0.2 },
      },
    ],
    xpReward: 115,
    difficulty: 'Easy',
    tags: ['museum', 'maritime', 'dutch', 'prison'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-009',
    name: 'Old Dutch Hospital',
    description:
      '17th-century Dutch colonial hospital now boutique shopping arcade preserving arcades and verandas.',
    model3dPath: 'Galle-Old-Dutch-Hospital.glb',
    location: {
      latitude: 6.0278,
      longitude: 80.2155,
      name: 'Hospital Street, Galle Fort, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Central Courtyard',
        description: 'Original Dutch courtyard for ventilation.',
        position: { x: 0, y: 0.4, z: 0 },
      },
      {
        id: 'hotspot-2',
        name: 'Arched Veranda',
        description: 'Continuous arcade connecting patient wards.',
        position: { x: 0.5, y: 0.6, z: 0.1 },
      },
      {
        id: 'hotspot-3',
        name: 'Ward Columns',
        description: 'Massive stone columns supporting roof.',
        position: { x: -0.3, y: 0.7, z: 0.2 },
      },
    ],
    xpReward: 105,
    difficulty: 'Easy',
    tags: ['hospital', 'dutch', 'arcade', 'colonial'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-010',
    name: 'Tsunami Honganji Viharaya',
    description:
      '30m tall Buddha statue built post-2004 tsunami as protective landmark in Hikkaduwa.',
    model3dPath: 'Galle-Tsunami-Honganji-Viharaya.glb',
    location: {
      latitude: 6.14,
      longitude: 80.1,
      name: 'Hikkaduwa, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Right Hand Mudra',
        description: 'Abhaya mudra granting fearlessness.',
        position: { x: -0.35, y: 0.55, z: 0.25 },
      },
      {
        id: 'hotspot-2',
        name: 'Serene Face',
        description: 'Compassionate expression watching ocean.',
        position: { x: 0, y: 0.85, z: 0.15 },
      },
      {
        id: 'hotspot-3',
        name: 'Lotus Base',
        description: 'Eight-petaled lotus throne symbolizing purity.',
        position: { x: 0.2, y: 0.05, z: 0.1 },
      },
    ],
    xpReward: 155,
    difficulty: 'Hard',
    tags: ['buddha', 'tsunami', 'statue', 'buddhist'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-011',
    name: 'VOC Monogram Stone',
    description:
      'Carved sandstone slab bearing Dutch East India Company VOC insignia above main fort gate.',
    model3dPath: 'Galle-VOC-Monogram-Stone.glb',
    location: {
      latitude: 6.028624,
      longitude: 80.216797,
      name: 'Galle Fort Main Gate, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Interlocked VOC',
        description: 'Famous monogram letters signifying company power.',
        position: { x: 0, y: 0.65, z: 0.15 },
      },
      {
        id: 'hotspot-2',
        name: 'Lion Supporter',
        description: 'Heraldic lion holding VOC shield.',
        position: { x: 0.35, y: 0.75, z: 0.05 },
      },
      {
        id: 'hotspot-3',
        name: '1669 Date',
        description: 'Construction date marking Dutch dominance.',
        position: { x: -0.25, y: 0.45, z: 0.2 },
      },
    ],
    xpReward: 165,
    difficulty: 'Hard',
    tags: ['stone', 'voc', 'dutch', 'insignia'],
    createdAt: admin.firestore.Timestamp.now(),
  },
  {
    id: 'galle-012',
    name: 'Raksha Devil Mask',
    description:
      'Traditional exorcism mask from Ambalangoda with bulging eyes and fangs for Sanni Yakuma ritual.',
    model3dPath: 'Galle-Raksha-Devil-Mask.glb',
    location: {
      latitude: 6.247,
      longitude: 80.055,
      name: 'Ariyapala Mask Museum, Ambalangoda, Southern Province',
    },
    hotspots: [
      {
        id: 'hotspot-1',
        name: 'Demon Fangs',
        description: 'Exaggerated ivory-like tusks for demon portrayal.',
        position: { x: 0.25, y: 0.35, z: 0.4 },
      },
      {
        id: 'hotspot-2',
        name: 'Rolling Eyes',
        description: 'Protruding googly eyes creating hypnotic effect.',
        position: { x: -0.1, y: 0.75, z: 0.2 },
      },
      {
        id: 'hotspot-3',
        name: 'Curved Horns',
        description: 'Ram-like horns painted blood red.',
        position: { x: 0.4, y: 0.85, z: 0 },
      },
    ],
    xpReward: 95,
    difficulty: 'Medium',
    tags: ['mask', 'raksha', 'exorcism', 'ritual'],
    createdAt: admin.firestore.Timestamp.now(),
  },
];

async function setupRelicsCollection() {
  try {
    console.log('🚀 Starting Firebase Relics Collection Setup...\n');

    for (const relic of relicsData) {
      const { id, model3dPath, ...data } = relic;

      // Convert model3dPath to Firebase Storage HTTPS URL
      // Your files are stored at: gs://sri-explore.firebasestorage.app/{filename}
      // Convert to: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
      const bucketName = 'sri-explore.firebasestorage.app';
      const model3dUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(model3dPath)}?alt=media`;

      await db
        .collection('relics')
        .doc(id)
        .set({
          ...data,
          model3dUrl, // Add the resolved URL to Firestore
        });
      console.log(`✅ Created relic: ${relic.name}`);
      console.log(`   Model URL: ${model3dUrl}`);
    }

    console.log('\n✨ All relics created successfully!');
    console.log(`📊 Total relics: ${relicsData.length}`);
    console.log(
      '\n✅ Your 3D models are already uploaded to Firebase Storage!',
    );
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
