import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface PlatformTiming {
  days: string;
  times: string;
  tip: string;
}

const BEST_TIMES: Record<string, PlatformTiming> = {
  Instagram: {
    days: "Tue – Fri",
    times: "7–9 am · 11 am–1 pm",
    tip: "Morning and lunch breaks see the highest engagement. Avoid posting after 9 pm.",
  },
  TikTok: {
    days: "Tue – Thu",
    times: "6–10 am · 7–9 pm",
    tip: "Early morning catches commuters. Evening captures the post-dinner scroll.",
  },
  Facebook: {
    days: "Wed – Fri",
    times: "11 am–1 pm · 1–4 pm",
    tip: "Mid-week afternoon posts get 18% more engagement. Weekends see a drop.",
  },
  LinkedIn: {
    days: "Tue – Thu",
    times: "7–8 am · 12–1 pm",
    tip: "Business hours only. Early morning before meetings is the sweet spot.",
  },
  "Twitter/X": {
    days: "Mon – Wed",
    times: "8–10 am · 6–9 pm",
    tip: "Weekday mornings ride the news cycle. Evening posts get retweet spikes.",
  },
};

interface BestTimeCardProps {
  platform: string;
  multiPlatforms?: string[];
}

export default function BestTimeCard({ platform, multiPlatforms }: BestTimeCardProps) {
  const colors = useColors();
  const [collapsed, setCollapsed] = useState(false);

  const platforms = multiPlatforms ?? [platform];
  const validPlatforms = platforms.filter((p) => BEST_TIMES[p]);

  if (validPlatforms.length === 0) return null;

  const isMulti = validPlatforms.length > 1;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: "#F5F3FF",
          borderColor: "#DDD6FE",
          borderRadius: (colors as any).radius / 2,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => setCollapsed((c) => !c)}
        activeOpacity={0.7}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Feather name="clock" size={14} color="#7C3AED" />
          <Text style={styles.headerText}>Best time to post</Text>
        </View>
        <Feather
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={14}
          color="#7C3AED"
        />
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.body}>
          {isMulti ? (
            validPlatforms.map((p) => {
              const t = BEST_TIMES[p]!;
              return (
                <View key={p} style={styles.multiRow}>
                  <Text style={styles.multiPlatformLabel}>{p}</Text>
                  <View style={styles.multiRight}>
                    <Text style={styles.multiDays}>{t.days}</Text>
                    <Text style={styles.multiTimes}>{t.times}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <>
              <View style={styles.singleRow}>
                <View style={styles.pill}>
                  <Feather name="calendar" size={11} color="#7C3AED" />
                  <Text style={styles.pillText}>{BEST_TIMES[validPlatforms[0]]!.days}</Text>
                </View>
                <View style={styles.pill}>
                  <Feather name="clock" size={11} color="#7C3AED" />
                  <Text style={styles.pillText}>{BEST_TIMES[validPlatforms[0]]!.times}</Text>
                </View>
              </View>
              <Text style={styles.tip}>{BEST_TIMES[validPlatforms[0]]!.tip}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  headerText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#7C3AED",
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  singleRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#7C3AED",
  },
  tip: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6D28D9",
    lineHeight: 17,
  },
  multiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DDD6FE",
  },
  multiPlatformLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#5B21B6",
    flex: 1,
  },
  multiRight: {
    alignItems: "flex-end",
  },
  multiDays: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#7C3AED",
  },
  multiTimes: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#6D28D9",
  },
});
