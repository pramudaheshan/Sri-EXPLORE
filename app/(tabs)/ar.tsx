import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Camera,
  QrCode,
  Info,
  Volume2,
  Share,
  Download,
  RotateCcw,
  X,
  Zap,
  Eye,
  History
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function ARScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [showARView, setShowARView] = useState(false);
  const [scannedArtifact, setScannedArtifact] = useState<any>(null);

  // Mock AR artifact data
  const artifactData = {
    name: 'Ancient Buddha Statue',
    period: '5th Century CE',
    location: 'Sigiriya',
    description: 'This magnificent Buddha statue represents the pinnacle of ancient Sri Lankan craftsmanship. Carved from solid granite during the reign of King Kashyapa I, it showcases the sophisticated artistic traditions of the time.',
    historicalSignificance: 'This statue served as a spiritual center for monks and pilgrims who visited the Sigiriya fortress. Its positioning and craftsmanship reflect the advanced architectural knowledge of ancient Sri Lankan civilization.',
    audioAvailable: true,
    modelLoaded: true,
  };

  const recentScans = [
    { id: 1, name: 'Temple Bell', location: 'Temple of Tooth', time: '2 hours ago' },
    { id: 2, name: 'Stone Inscription', location: 'Polonnaruwa', time: '1 day ago' },
    { id: 3, name: 'Ancient Coin', location: 'Anuradhapura', time: '2 days ago' },
  ];

  useEffect(() => {
    if (isScanning) {
      // Simulate QR code detection
      const timer = setTimeout(() => {
        setIsScanning(false);
        setScannedArtifact(artifactData);
        setShowARView(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isScanning]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient colors={['#20B2AA', '#48D1CC']} style={styles.permissionGradient}>
          <Camera size={80} color="#FFFFFF" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes and unlock AR experiences
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const handleQRScan = () => {
    if (Platform.OS === 'web') {
      // Simulate QR scan on web
      setIsScanning(true);
    } else {
      // Actual camera scanning would be implemented here
      setIsScanning(true);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const playAudio = () => {
    Alert.alert('Audio', 'Audio narration would play here');
  };

  const shareArtifact = () => {
    Alert.alert('Share', 'Sharing artifact information...');
  };

  const downloadModel = () => {
    Alert.alert('Download', '3D model download started...');
  };

  if (showARView && scannedArtifact) {
    return (
      <View style={styles.arContainer}>
        <LinearGradient colors={['#000000', '#333333']} style={styles.arBackground}>
          {/* AR Header */}
          <View style={styles.arHeader}>
            <TouchableOpacity
              style={styles.arCloseButton}
              onPress={() => setShowARView(false)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.arHeaderTitle}>AR Experience</Text>
            <TouchableOpacity style={styles.arInfoButton}>
              <Info size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* 3D Model Placeholder */}
          <View style={styles.modelContainer}>
            <View style={styles.modelPlaceholder}>
              <Eye size={60} color="#20B2AA" />
              <Text style={styles.modelText}>3D Buddha Statue</Text>
              <Text style={styles.modelSubtext}>Tap and drag to rotate</Text>
            </View>
          </View>

          {/* AR Controls */}
          <View style={styles.arControls}>
            <TouchableOpacity style={styles.arControlButton} onPress={playAudio}>
              <Volume2 size={24} color="#FFFFFF" />
              <Text style={styles.arControlText}>Audio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.arControlButton} onPress={shareArtifact}>
              <Share size={24} color="#FFFFFF" />
              <Text style={styles.arControlText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.arControlButton} onPress={downloadModel}>
              <Download size={24} color="#FFFFFF" />
              <Text style={styles.arControlText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Information Panel */}
          <ScrollView style={styles.infoPanel} showsVerticalScrollIndicator={false}>
            <View style={styles.infoPanelContent}>
              <Text style={styles.artifactName}>{scannedArtifact.name}</Text>
              <Text style={styles.artifactPeriod}>{scannedArtifact.period}</Text>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Description</Text>
                <Text style={styles.infoSectionText}>{scannedArtifact.description}</Text>
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Historical Significance</Text>
                <Text style={styles.infoSectionText}>{scannedArtifact.historicalSignificance}</Text>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#20B2AA', '#48D1CC']} style={styles.header}>
        <Text style={styles.headerTitle}>AR Scanner</Text>
        <Text style={styles.headerSubtitle}>Scan QR codes to unlock AR experiences</Text>
      </LinearGradient>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {Platform.OS !== 'web' ? (
          <CameraView style={styles.camera} facing={facing}>
            {/* Scanning Overlay */}
            <View style={styles.scanningOverlay}>
              <View style={styles.scanningFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                
                {isScanning && (
                  <View style={styles.scanningLine}>
                    <LinearGradient
                      colors={['transparent', '#32CD32', 'transparent']}
                      style={styles.scanLine}
                    />
                  </View>
                )}
              </View>
              
              <Text style={styles.scanInstructions}>
                {isScanning ? 'Scanning QR Code...' : 'Position QR code within the frame'}
              </Text>
            </View>

            {/* Camera Controls */}
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                <RotateCcw size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.scanButton, isScanning && styles.scanButtonActive]}
                onPress={handleQRScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Zap size={32} color="#FFFFFF" />
                ) : (
                  <QrCode size={32} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.controlButton}>
                <Info size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </CameraView>
        ) : (
          // Web fallback
          <View style={styles.webCamera}>
            <View style={styles.webCameraContent}>
              <Camera size={80} color="#20B2AA" />
              <Text style={styles.webCameraText}>Camera Preview</Text>
              <Text style={styles.webCameraSubtext}>
                On mobile devices, this would show the live camera feed
              </Text>
              
              <TouchableOpacity
                style={[styles.scanButton, isScanning && styles.scanButtonActive]}
                onPress={handleQRScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Zap size={32} color="#FFFFFF" />
                ) : (
                  <QrCode size={32} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              
              {isScanning && (
                <Text style={styles.scanningText}>Scanning for QR codes...</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Recent Scans */}
      <View style={styles.recentScans}>
        <View style={styles.recentHeader}>
          <History size={20} color="#333" />
          <Text style={styles.recentTitle}>Recent Scans</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentScans.map((scan) => (
            <TouchableOpacity key={scan.id} style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <QrCode size={20} color="#20B2AA" />
              </View>
              <Text style={styles.recentName}>{scan.name}</Text>
              <Text style={styles.recentLocation}>{scan.location}</Text>
              <Text style={styles.recentTime}>{scan.time}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
  },
  permissionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 40,
  },
  permissionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  webCamera: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webCameraContent: {
    alignItems: 'center',
  },
  webCameraText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginTop: 20,
  },
  webCameraSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  scanningOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#32CD32',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanningLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
  },
  scanLine: {
    flex: 1,
  },
  scanInstructions: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 80,
    height: 80,
    backgroundColor: '#32CD32',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  scanningText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#20B2AA',
    marginTop: 20,
  },
  recentScans: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginLeft: 8,
  },
  recentItem: {
    width: 120,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  recentIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E8F8F5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentName: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  recentLocation: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  recentTime: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    textAlign: 'center',
  },
  // AR View Styles
  arContainer: {
    flex: 1,
  },
  arBackground: {
    flex: 1,
  },
  arHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  arCloseButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  arInfoButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
  },
  modelPlaceholder: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#20B2AA',
    borderStyle: 'dashed',
  },
  modelText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  modelSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 8,
  },
  arControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  arControlButton: {
    alignItems: 'center',
  },
  arControlText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
    marginTop: 4,
  },
  infoPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 300,
  },
  infoPanelContent: {
    padding: 20,
  },
  artifactName: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#333',
  },
  artifactPeriod: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#20B2AA',
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  infoSectionText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 20,
  },
});