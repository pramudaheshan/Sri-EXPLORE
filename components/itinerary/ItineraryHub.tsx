import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import {
  Clock,
  RefreshCw
} from "lucide-react-native";

const TEAL = "#20B2AA";

const COLORS = {
  bg: "#0c1414",
  card: "#101c1c",
  cardBorder: "rgba(255,255,255,0.05)",
  text: "#eaf4f3",
  muted: "#9fb3b1",
  teal: TEAL
};

type ItineraryHubProps = {
  title?: string;
  startDate?: string;
  duration?: number;
  city?: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onViewMap?: () => void;
  itinerary?: Record<string, any>;
};

export default function ItineraryHub({
  title = "Your AI Travel Plan",
  startDate,
  duration,
  city,
  onEdit,
  onRegenerate,
  onViewMap,
  itinerary
}: ItineraryHubProps): React.JSX.Element {
  const daysArr = itinerary
    ? Object.entries(itinerary).map(([day, activities]) => ({
        day,
        activities: Array.isArray(activities) ? activities : Object.values(activities || {})
      }))
    : [];

  const computedDuration = duration ?? (daysArr.length || 1);

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={["#083533", "#0b1c1c"]}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>{title}</Text>

        <View style={styles.heroRow}>
          <View style={styles.heroItem}>
            <Clock size={18} color={TEAL} />
            <Text style={styles.heroText}>{computedDuration} days</Text>
          </View>
        </View>

        <View style={styles.heroButtons}>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={onRegenerate}
          >
            <RefreshCw size={16} color={TEAL} />
            <Text style={styles.heroBtnText}>Regenerate</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Daily Plan</Text>
      </View>

      {daysArr.length > 0 ? (
        daysArr.map((dayItem: any, index) => {
          const dayCity = dayItem.activities[0]?.city || city || "Sri Lanka";
          const dayNumber = String(dayItem.day).replace(/^Day\s*/i, "");
          const schedule = dayItem.activities.map((activity: any) => ({
            time: activity.time || "",
            label: activity.place
          }));

          const hotels = Array.from(
            new Set(
              dayItem.activities.flatMap((activity: any) =>
                Array.isArray(activity.hotels) ? activity.hotels : []
              )
            )
          )
            .filter((hotel): hotel is string => typeof hotel === "string" && hotel.length > 0)
            .slice(0, 3);

          return (
            <View key={index} style={styles.dayCard}>
              <Text style={styles.dayTitle}>Day {dayNumber} - {dayCity}</Text>

              <View style={styles.scheduleBlock}>
                {schedule.map((entry: any, scheduleIndex: number) => (
                  <View key={scheduleIndex} style={styles.scheduleRow}>
                    <Text style={styles.scheduleTime}>{entry.time}</Text>
                    <Text style={styles.scheduleText}>{entry.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.hotelBlock}>
                <Text style={styles.hotelTitle}>Hotel recommendation to stay</Text>
                {hotels.length > 0 ? (
                  hotels.map((hotel: string) => (
                    <Text key={hotel} style={styles.hotelItem}>{hotel}</Text>
                  ))
                ) : (
                  <Text style={styles.hotelItem}>{dayCity} Central Hotel</Text>
                )}
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.emptyText}>No itinerary generated yet</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg
  },

  hero: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12
  },

  heroRow: {
    flexDirection: "row"
  },

  heroItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20
  },

  heroText: {
    color: COLORS.text,
    marginLeft: 6,
    fontSize: 14
  },

  heroButtons: {
    flexDirection: "row",
    marginTop: 18
  },

  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 10
  },

  heroBtnText: {
    marginLeft: 6,
    color: COLORS.teal,
    fontWeight: "600",
    fontSize: 12
  },

  sectionHeader: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 10
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text
  },

  dayCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 18,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder
  },

  dayTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16
  },

  scheduleBlock: {
    gap: 12
  },

  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },

  scheduleTime: {
    width: 58,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.teal
  },

  scheduleText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500"
  },

  hotelBlock: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder
  },

  hotelTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8
  },

  hotelItem: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 6
  },

  emptyText: {
    marginTop: 20,
    textAlign: "center",
    color: COLORS.muted
  }
});
