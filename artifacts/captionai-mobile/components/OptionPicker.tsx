import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  placeholder?: string;
}

export default function OptionPicker({ label, value, options, onSelect, placeholder }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={styles.fieldWrapper}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={[
            styles.trigger,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius / 2,
            },
          ]}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.triggerText,
              { color: value ? colors.foreground : colors.mutedForeground },
            ]}
            numberOfLines={1}
          >
            {value || placeholder || `Select ${label}`}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
                paddingBottom: insets.bottom + 16,
                marginHorizontal: 16,
                marginBottom: Platform.OS === "web" ? 40 : insets.bottom + 20,
              },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {options.map((opt) => {
                const active = opt === value;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      onSelect(opt);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      { borderBottomColor: colors.border },
                      active && { backgroundColor: colors.secondary },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: active ? colors.primary : colors.foreground },
                      ]}
                    >
                      {opt}
                    </Text>
                    {active && <Feather name="check" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldWrapper: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
  },
  triggerText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: 420,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    padding: 16,
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
