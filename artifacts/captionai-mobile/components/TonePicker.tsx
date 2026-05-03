import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export const TONES = [
  "Professional",
  "Casual",
  "Funny",
  "Inspirational",
  "Storytelling",
  "Bold",
  "Empowering",
  "Heartfelt",
  "Witty",
  "Luxurious",
  "Playful",
  "Authentic",
];

const MAX_TONES = 3;

interface Props {
  selected: string[];
  onToggle: (tone: string) => void;
}

export default function TonePicker({ selected, onToggle }: Props) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      {TONES.map((tone) => {
        const isActive = selected.includes(tone);
        const disabled = !isActive && selected.length >= MAX_TONES;
        return (
          <TouchableOpacity
            key={tone}
            onPress={() => !disabled && onToggle(tone)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.primary : colors.card,
                borderColor: isActive ? colors.primary : colors.border,
                borderRadius: colors.radius / 2,
                opacity: disabled ? 0.4 : 1,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? "#fff" : colors.foreground },
              ]}
            >
              {tone}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 13,
    fontFamily: "Nunito_500Medium",
  },
});
