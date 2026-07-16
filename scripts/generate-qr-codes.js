const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');

const relicsData = [
  { id: 'galle-001', name: 'Galle Lighthouse' },
  { id: 'galle-002', name: 'Galle Clocktower' },
  { id: 'galle-003', name: 'All Saints Church' },
  { id: 'galle-004', name: 'Colonial Anchor' },
  { id: 'galle-005', name: 'Dutch Reformed Church' },
  { id: 'galle-006', name: 'Dutch Tombstone' },
  { id: 'galle-007', name: 'Meeran Jumma Mosque' },
  { id: 'galle-008', name: 'National Maritime Museum' },
  { id: 'galle-009', name: 'Old Dutch Hospital' },
  { id: 'galle-010', name: 'Tsunami Honganji Viharaya' },
  { id: 'galle-011', name: 'VOC Monogram Stone' },
  { id: 'galle-012', name: 'Raksha Devil Mask' },
  { id: 'galle-014', name: 'Tea Cup' },
];

// Helper to create custom QR code with text overlay
async function createCustomQRCode(qrData, relicName, outputPath) {
  // Generate QR code to canvas
  const qrCanvas = Canvas.createCanvas(300, 300);
  const ctx = qrCanvas.getContext('2d');

  // Generate QR code as data URL first
  const qrDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 0.95,
    margin: 2,
    width: 300,
  });

  // Parse data URL to get image
  const qrImage = await Canvas.loadImage(qrDataUrl);
  ctx.drawImage(qrImage, 0, 0);

  // Create final canvas with space for text
  const padding = 30;
  const textHeight = 70;
  const finalWidth = 300 + padding * 2;
  const finalHeight = 300 + padding * 2 + textHeight;

  const finalCanvas = Canvas.createCanvas(finalWidth, finalHeight);
  const finalCtx = finalCanvas.getContext('2d');

  // White background
  finalCtx.fillStyle = '#ffffff';
  finalCtx.fillRect(0, 0, finalWidth, finalHeight);

  // Place QR code in center
  finalCtx.drawImage(qrCanvas, padding, padding);

  // Dark background for text
  finalCtx.fillStyle = '#1a1a1a';
  finalCtx.fillRect(0, finalHeight - textHeight, finalWidth, textHeight);

  // Add relic name text
  finalCtx.fillStyle = '#ffffff';
  finalCtx.font = 'bold 20px Arial';
  finalCtx.textAlign = 'center';
  finalCtx.fillText(relicName, finalWidth / 2, finalHeight - textHeight + 30);

  // Add SriREVEAL branding at bottom center ABOVE relic name (in same dark box)
  // Using the style: fontSize: 28, fontWeight: '800', color: '#fff', fontFamily: 'Poppins-Bold'
  const brandingFontSize = 14;
  const brandingFont = `800 ${brandingFontSize}px Poppins, Arial, sans-serif`;

  // Position: bottom center, above relic name - properly centered
  const brandingY = finalHeight - textHeight + 55;

  // Draw "Sri" and "REVEAL" together with no gap
  finalCtx.font = brandingFont;
  finalCtx.textAlign = 'center';

  // Draw "Sri" in white
  finalCtx.fillStyle = '#ffffff';
  finalCtx.fillText('Sri', finalWidth / 2 - 30, brandingY);

  // Draw "REVEAL" in gold right next to it (no gap)
  finalCtx.fillStyle = '#FFD700';
  finalCtx.fillText('REVEAL', finalWidth / 2 + 8, brandingY);

  // Save to file
  const buffer = finalCanvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

async function generateQRCodes() {
  const outputDir = path.join(__dirname, '../assets/qrcodes');

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🚀 Generating Custom QR codes with Relic Names...\n');

  for (const relic of relicsData) {
    try {
      const qrData = `relic:${relic.id}`;
      const filename = path.join(outputDir, `${relic.id}.png`);

      await createCustomQRCode(qrData, relic.name, filename);

      console.log(`✅ Generated: ${relic.name}`);
      console.log(`   File: assets/qrcodes/${relic.id}.png`);
      console.log(`   Data: ${qrData}\n`);
    } catch (error) {
      console.error(`❌ Error generating QR for ${relic.id}:`, error.message);
    }
  }

  console.log('✨ All custom QR codes generated successfully!');
  console.log(`\n📁 QR codes saved in: assets/qrcodes/`);
  console.log('\n📝 Features:');
  console.log('   ✓ Relic name at bottom');
  console.log('   ✓ App branding (Sri-EXPLORE)');
  console.log('   ✓ Professional design with padding\n');

  process.exit(0);
}

generateQRCodes();
