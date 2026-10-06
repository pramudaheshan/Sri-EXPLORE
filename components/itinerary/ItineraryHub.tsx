// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Edit2,
  RefreshCw,
  Map,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const TEAL = '#20B2AA';

const COLORS = {
  teal: TEAL,
  offWhite: '#F0F4F3',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.15)',
  glassLight: 'rgba(255,255,255,0.05)',
  gray: '#B8C4C2',
  darkText: '#12322f',
};

type Day = {
  day: number;
  location: string;
  summary: string;
};

export default function ItineraryHub({
  title = 'Your Smart Itinerary',
  startDate = '2025-07-01',
  duration = 3,
  upcoming = sampleDays,
  onEdit,
  onRegenerate,
  onViewMap,
}: {
  title?: string;
  startDate?: string;
  duration?: number;
  upcoming?: Day[];
  onEdit?: () => void;
  onRegenerate?: () => void;
  onViewMap?: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient
        colors={['#062f2b', '#0d1a1a']}
        style={styles.backgroundGradient}
      />
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
          <BlurView intensity={30} tint="light" style={styles.iconBlur}>
            <Edit2 size={18} color={TEAL} />
          </BlurView>
        </TouchableOpacity>
      </View>

      <BlurView intensity={40} tint="light" style={styles.overviewCard}>
        <LinearGradient
          colors={[`${TEAL}1A`, 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.overviewTop}>
          <Calendar size={18} color={TEAL} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.overTitle}>Trip Start</Text>
            <Text style={styles.overValue}>{startDate}</Text>
          </View>
          <View style={styles.flexSpacer} />
          <Clock size={18} color={TEAL} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.overTitle}>Duration</Text>
            <Text style={styles.overValue}>{duration} days</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.action} onPress={onRegenerate}>
            <BlurView intensity={25} tint="light" style={styles.actionBlur}>
              <RefreshCw size={16} color={TEAL} />
              <Text style={styles.actionText}>Regenerate</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={onViewMap}>
            <BlurView intensity={25} tint="light" style={styles.actionBlur}>
              <Map size={16} color={TEAL} />
              <Text style={styles.actionText}>View Map</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={onEdit}>
            <BlurView intensity={25} tint="light" style={styles.actionBlur}>
              <Edit2 size={16} color={TEAL} />
              <Text style={styles.actionText}>Edit</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </BlurView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Days</Text>
        <TouchableOpacity>
          <ChevronRight size={18} color="#8b8b8b" />
        </TouchableOpacity>
      </View>

      {upcoming.map((d) => (
        <BlurView
          key={d.day}
          intensity={30}
          tint="light"
          style={styles.dayCard}
        >
          <View style={styles.dayLeft}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Day {d.day}</Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.dayTitle}>{d.location}</Text>
              <Text style={styles.daySummary} numberOfLines={2}>
                {d.summary}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.dayAction}>
            <ChevronRight size={20} color={TEAL} />
          </TouchableOpacity>
        </BlurView>
      ))}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const sampleDays: Day[] = [
  {
    day: 1,
    location: 'Kandy - Temple & Gardens',
    summary:
      'Visit the Temple of the Tooth, stroll the Royal Botanical Gardens and enjoy a cultural show in the evening.',
  },
  {
    day: 2,
    location: 'Dambulla & Sigiriya',
    summary:
      'Explore Dambulla Cave Temple and climb Sigiriya Rock Fortress for breathtaking views.',
  },
  {
    day: 3,
    location: 'Colombo - City & Coast',
    summary:
      'Return to Colombo by scenic train, enjoy lunch at a local favorite and walk the Galle Face Green.',
  },
];

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: '#1a1a1a',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    fontWeight: '700',
  },
  iconButton: { marginLeft: 'auto' },
  iconBlur: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  backgroundGradient: { ...StyleSheet.absoluteFillObject },
  overviewCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 18,
    backgroundColor: 'rgba(10,12,12,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  overviewTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  overTitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  overValue: { fontSize: 14, fontWeight: '700', color: COLORS.offWhite },
  flexSpacer: { flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  action: { width: (width - 72) / 3 },
  actionBlur: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  actionText: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.offWhite },
  dayCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  dayLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  badge: {
    width: 64,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${TEAL}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: COLORS.offWhite, fontWeight: '700' },
  dayTitle: { fontSize: 14, fontWeight: '700', color: COLORS.offWhite },
  daySummary: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    maxWidth: width - 160,
  },
  dayAction: { marginLeft: 12 },
});
