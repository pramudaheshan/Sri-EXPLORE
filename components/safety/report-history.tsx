// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Trash2, TriangleAlert as AlertTriangle, MapPin, Clock } from 'lucide-react-native';
import {
  getUserIncidents,
  deleteUserIncident,
  getCurrentUserId,
  FirestoreIncident,
} from '../../services/incidentService';

const SAFE_TOP = Platform.OS === 'ios' ? 54 : 36;

const CAT_COLORS: Record<string, string> = {
  robbery:          '#EF4444',
  harassment:       '#F97316',
  accident:         '#F59E0B',
  unsafe_area:      '#8B5CF6',
  scam:             '#EC4899',
  natural_disaster: '#3B82F6',
  other:            '#6B7280',
};

const CAT_EMOJIS: Record<string, string> = {
  robbery:          '🔓',
  harassment:       '⚠️',
  accident:         '🚗',
  unsafe_area:      '🚧',
  scam:             '💸',
  natural_disaster: '🌊',
  other:            '📌',
};

function formatDate(timestamp: any): string {
  let d: Date;
  if (timestamp?.seconds) d = new Date(timestamp.seconds * 1000);
  else if (timestamp?.toDate) d = timestamp.toDate();
  else d = new Date(timestamp);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + '  ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function ReportHistoryScreen() {
  const router = useRouter();
  const [reports, setReports]   = useState<FirestoreIncident[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const userId = getCurrentUserId();

  const load = useCallback(async () => {
    try {
      const data = await getUserIncidents(userId);
      setReports(data);
    } catch (e: any) {
      console.error('[ReportHistory] load error:', e);
      Alert.alert('Error', 'Could not load your reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback((item: FirestoreIncident) => {
    Alert.alert(
      'Delete Report?',
      `"${item.title || 'Incident'}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(item.id);
            try {
              await deleteUserIncident(item.id);
              setReports(prev => prev.filter(r => r.id !== item.id));
            } catch {
              Alert.alert('Error', 'Could not delete report. Try again.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = ({ item }: { item: FirestoreIncident }) => {
    const color = CAT_COLORS[item.category] ?? '#6B7280';
    const emoji = CAT_EMOJIS[item.category] ?? '📌';
    const isDeleting = deleting === item.id;
    return (
      <View style={S.card}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={S.cardTint} />
        <View style={S.cardHighlight} />
        <View style={S.cardRow}>
          {/* Category badge */}
          <View style={[S.emojiBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={S.emoji}>{emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.cardTitle} numberOfLines={1}>{item.title || (emoji + ' Incident')}</Text>
            <View style={S.metaRow}>
              <Clock size={11} color="#64748B" />
              <Text style={S.metaText}>{formatDate(item.timestamp)}</Text>
            </View>
            {item.locationName ? (
              <View style={S.metaRow}>
                <MapPin size={11} color="#64748B" />
                <Text style={S.metaText} numberOfLines={1}>{item.locationName}</Text>
              </View>
            ) : null}
          </View>
          {/* Delete button */}
          <TouchableOpacity
            style={S.deleteBtn}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
            activeOpacity={0.7}>
            {isDeleting
              ? <ActivityIndicator size="small" color="#EF4444" />
              : <Trash2 size={17} color="#EF4444" />}
          </TouchableOpacity>
        </View>
        {item.description ? (
          <Text style={S.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        {/* Status pill */}
        <View style={[S.statusPill, {
          backgroundColor: item.status === 'resolved' ? '#14532D44'
            : item.status === 'verified'  ? '#1E3A5F44' : '#2D1B0044',
          borderColor: item.status === 'resolved' ? '#22C55E55'
            : item.status === 'verified'  ? '#3B82F655' : '#F59E0B55',
        }]}>
          <Text style={[S.statusText, {
            color: item.status === 'resolved' ? '#86EFAC'
              : item.status === 'verified'  ? '#93C5FD' : '#FCD34D',
          }]}>{(item.status ?? 'pending').toUpperCase()}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[S.header, { paddingTop: SAFE_TOP + 8 }]}>
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={S.headerTint} />
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={18} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>My Reports</Text>
        <Text style={S.headerCount}>{reports.length} total</Text>
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={S.loadingText}>Loading your reports…</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={S.center}>
          <AlertTriangle size={40} color="#475569" />
          <Text style={S.emptyTitle}>No reports yet</Text>
          <Text style={S.emptyDesc}>Reports you submit will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },

  header: {
    overflow: 'hidden',
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(255,255,255,0.16)',
  },
  headerTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,14,30,0.14)' },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, color: '#F1F5F9', fontSize: 18, fontFamily: 'Poppins-SemiBold' },
  headerCount: { color: '#64748B', fontSize: 13, fontFamily: 'Poppins-Regular' },

  list: { padding: 16, gap: 12 },

  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.18)',
    padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
  cardTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,16,34,0.14)' },
  cardHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  emojiBadge: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 20 },
  cardTitle: { color: '#F1F5F9', fontSize: 14, fontFamily: 'Poppins-SemiBold', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  metaText: { color: '#64748B', fontSize: 11, fontFamily: 'Poppins-Regular', flex: 1 },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  desc: { color: '#94A3B8', fontSize: 12, fontFamily: 'Poppins-Regular', lineHeight: 18, marginBottom: 10 },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusText: { fontSize: 10, fontFamily: 'Poppins-SemiBold', letterSpacing: 0.8 },

  loadingText: { color: '#64748B', fontSize: 14, fontFamily: 'Poppins-Regular', marginTop: 12 },
  emptyTitle: { color: '#94A3B8', fontSize: 16, fontFamily: 'Poppins-SemiBold', textAlign: 'center' },
  emptyDesc:  { color: '#475569', fontSize: 13, fontFamily: 'Poppins-Regular', textAlign: 'center', lineHeight: 20 },
});
