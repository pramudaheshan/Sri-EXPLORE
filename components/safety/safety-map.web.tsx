// @ts-nocheck
// Web fallback for Safety Map (react-native-maps is not supported on web)
// Shows incident reports in a clean list format instead of a map

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Clock, AlertTriangle, Shield, Users } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import { subscribeToIncidents, FirestoreIncident } from '../../services/incidentService';

const CATEGORY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  robbery:          { label: 'Robbery / Theft',  color: '#EF4444', emoji: '🔓' },
  harassment:       { label: 'Harassment',        color: '#F97316', emoji: '⚠️' },
  accident:         { label: 'Accident',          color: '#F59E0B', emoji: '🚗' },
  unsafe_area:      { label: 'Unsafe Area',       color: '#8B5CF6', emoji: '🚧' },
  scam:             { label: 'Scam / Fraud',      color: '#EC4899', emoji: '💸' },
  natural_disaster: { label: 'Natural Disaster',  color: '#3B82F6', emoji: '🌊' },
  other:            { label: 'Other',             color: '#6B7280', emoji: '📌' },
};

const getReportAge = (timestamp: any): string => {
  let ts: Date;
  if (timestamp?.seconds) ts = new Date(timestamp.seconds * 1000);
  else if (timestamp?.toDate) ts = timestamp.toDate();
  else ts = new Date(timestamp);
  const diffMins = Math.floor((Date.now() - ts.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return ts.toLocaleDateString();
};

export default function SafetyMapScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<FirestoreIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToIncidents((data) => {
      setReports(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#FFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Safety Map</Text>
          <Text style={styles.headerSub}>Map view requires mobile app</Text>
        </View>
      </View>

      {/* Web notice */}
      <View style={styles.notice}>
        <LinearGradient colors={['rgba(32,178,170,0.2)', 'rgba(32,178,170,0.05)']} style={styles.noticeGrad}>
          <Shield size={20} color={COLORS.primary} />
          <Text style={styles.noticeText}>
            Interactive heatmap is available in the mobile app. Showing incident reports below.
          </Text>
        </LinearGradient>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total Reports</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{reports.filter(r => r.category === 'natural_disaster').length}</Text>
          <Text style={styles.statLabel}>Disaster Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{reports.filter(r => r.category !== 'natural_disaster').length}</Text>
          <Text style={styles.statLabel}>Incidents</Text>
        </View>
      </View>

      {/* Reports list */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Shield size={40} color={COLORS.primary} />
          <Text style={styles.emptyText}>No incidents reported yet</Text>
          <Text style={styles.emptySubText}>Sri Lanka is looking safe!</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {reports.map((report) => {
            const cfg = CATEGORY_CONFIG[report.category] ?? CATEGORY_CONFIG.other;
            return (
              <View key={report.id} style={styles.reportCard}>
                <View style={[styles.categoryStrip, { backgroundColor: cfg.color }]} />
                <View style={styles.reportBody}>
                  <View style={styles.reportTopRow}>
                    <Text style={styles.reportEmoji}>{cfg.emoji}</Text>
                    <View style={[styles.catBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
                      <Text style={[styles.catBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.reportTitle}>{report.title || cfg.label + ' Incident'}</Text>
                  {report.description ? (
                    <Text style={styles.reportDesc} numberOfLines={2}>{report.description}</Text>
                  ) : null}
                  <View style={styles.reportMeta}>
                    <View style={styles.metaItem}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.metaText}>{getReportAge(report.timestamp)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color="#94A3B8" />
                      <Text style={styles.metaText}>
                        {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Poppins-Bold' },
  headerSub: { color: '#94A3B8', fontSize: 12, fontFamily: 'Poppins-Regular' },
  notice: { marginHorizontal: 20, marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  noticeGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(32,178,170,0.3)',
  },
  noticeText: { flex: 1, color: '#94A3B8', fontSize: 13, fontFamily: 'Poppins-Regular' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statNum: { color: '#FFF', fontSize: 22, fontFamily: 'Poppins-Bold' },
  statLabel: { color: '#94A3B8', fontSize: 11, fontFamily: 'Poppins-Regular', marginTop: 2 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 14, fontFamily: 'Poppins-Regular' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#FFF', fontSize: 18, fontFamily: 'Poppins-SemiBold' },
  emptySubText: { color: '#94A3B8', fontSize: 14, fontFamily: 'Poppins-Regular' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  reportCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryStrip: { width: 4 },
  reportBody: { flex: 1, padding: 14 },
  reportTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reportEmoji: { fontSize: 18 },
  catBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  catBadgeText: { fontSize: 10, fontFamily: 'Poppins-Bold' },
  reportTitle: { color: '#F1F5F9', fontSize: 15, fontFamily: 'Poppins-SemiBold', marginBottom: 4 },
  reportDesc: { color: '#94A3B8', fontSize: 13, fontFamily: 'Poppins-Regular', marginBottom: 8, lineHeight: 20 },
  reportMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#64748B', fontSize: 11, fontFamily: 'Poppins-Regular' },
});
