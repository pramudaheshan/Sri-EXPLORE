const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const relicsData = [
  { id: 'galle-lighthouse-001', name: 'Galle Lighthouse' },
];

async function generateQRCodes() {
  const outputDir = path.join(__dirname, '../assets/qrcodes');

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🚀 Generating QR codes...\n');

  for (const relic of relicsData) {
    try {
      const qrData = `relic:${relic.id}`;
      const filename = path.join(outputDir, `${relic.id}.png`);

      await QRCode.toFile(filename, qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
      });

      console.log(`✅ Generated: ${relic.name}`);
      console.log(`   File: assets/qrcodes/${relic.id}.png`);
      console.log(`   Data: ${qrData}\n`);
    } catch (error) {
      console.error(`❌ Error generating QR for ${relic.id}:`, error);
    }
  }

  console.log('✨ All QR codes generated successfully!');
  console.log(`\n📁 QR codes saved in: assets/qrcodes/`);
  console.log('\n📝 You can print these codes or display them on screens.');
  console.log('   Users can scan them with the app to load 3D relics.\n');

  process.exit(0);
}

generateQRCodes();
