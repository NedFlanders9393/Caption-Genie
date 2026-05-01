import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export const PLATFORMS = [
  { id: "Instagram",  icon: "instagram" as const },
  { id: "TikTok",     icon: "music"     as const },
  { id: "Facebook",   icon: "facebook"  as const },
  { id: "LinkedIn",   icon: "linkedin"  as const },
  { id: "Twitter/X",  icon: "twitter"   as const },
  { id: "YouTube",    icon: "youtube"   as const },
  { id: "Pinterest",  icon: "bookmark"  as const },
];

const MAX = 7;

interface Props {
  selected: string[];
  onToggle: (platform: string) => void;
}

export default function PlatformPicker({ selected, onToggle }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {PLATFORMS.map((p) => {
        const isActive = selected.includes(p.id);
        const atMax = selected.length >= MAX && !isActive;
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => !atMax && onToggle(p.id)}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? colors.primary : colors.card,
                borderColor: isActive ? colors.primary : colors.border,
                borderRadius: colors.radius / 2,
                opacity: atMax ? 0.4 : 1,
              },
            ]}
            activeOpacity={0.75}
          >
            <Feather
              name={p.icon}
              size={14}
              color={isActive ? "#fff" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.label,
                { color: isActive ? "#fff" : colors.foreground },
              ]}
            >
              {p.id}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
