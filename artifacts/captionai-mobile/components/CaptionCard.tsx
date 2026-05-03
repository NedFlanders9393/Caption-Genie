import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface Props {
  index: number;
  caption: string;
  hashtags: string;
  favoriteId?: string;
  isFavorited?: boolean;
  onFavorite?: () => void;
  onRegenerate?: () => Promise<void>;
  isRegenerating?: boolean;
}

export default function CaptionCard({
  index,
  caption,
  hashtags,
  favoriteId,
  isFavorited = false,
  onFavorite,
  onRegenerate,
  isRegenerating,
}: Props) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const [shareReady, setShareReady] = useState(false);

  const fullText = hashtags ? `${caption}\n\n${hashtags}` : caption;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(fullText);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(fullText);
      return;
    }
    // Always copy to clipboard first — Facebook and some other apps block
    // pre-filled text from the share sheet by design, so clipboard is the
    // reliable fallback. The user can paste immediately after tapping their app.
    await Clipboard.setStringAsync(fullText);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareReady(true);
    setTimeout(() => setShareReady(false), 3000);
    try {
      const result = await Share.share(
        {
          message: fullText,
          // Providing a title helps apps like Facebook show a prompt
          title: "Caption from Inkwell",
        },
        {
          // iOS: show the subject field so apps that support it get the title
          subject: "Caption from Inkwell",
          // iOS: exclude AirDrop/files since this is text-only
          excludedActivityTypes: [],
        }
      );
      // If the user dismissed without sharing, nothing extra needed.
      // If they shared to Facebook (or any app that strips text), the
      // clipboard already has the caption — no further action required.
      void result;
    } catch (err: any) {
      // User cancelled — ignore. Any other error: let them know clipboard is ready.
      if (err?.message && !err.message.includes("cancel")) {
        Alert.alert(
          "Caption copied",
          "The share sheet couldn't open, but your caption is already copied — just paste it anywhere.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleFavorite = () => {
    if (!onFavorite) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        isFavorited ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
      );
    }
    onFavorite();
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isFavorited ? "#E8B669" : colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.secondary, borderRadius: colors.radius / 2 },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.primary }]}>#{index + 1}</Text>
        </View>
        <View style={styles.actions}>
          {onRegenerate && (
            <TouchableOpacity
              onPress={onRegenerate}
              disabled={isRegenerating}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              {isRegenerating ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.7}>
            <Feather
              name={shareReady ? "check" : "share-2"}
              size={16}
              color={shareReady ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopy} style={styles.iconBtn} activeOpacity={0.7}>
            <Feather
              name={copied ? "check" : "copy"}
              size={16}
              color={copied ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          {onFavorite && (
            <TouchableOpacity onPress={handleFavorite} style={styles.iconBtn} activeOpacity={0.7}>
              <Feather
                name={isFavorited ? "bookmark" : "bookmark"}
                size={16}
                color={isFavorited ? "#E8B669" : colors.mutedForeground}
                style={isFavorited ? styles.bookmarkFilled : undefined}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={[styles.caption, { color: colors.foreground }]}>{caption}</Text>

      {hashtags ? (
        <Text style={[styles.hashtags, { color: colors.primary }]}>{hashtags}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  actions: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    padding: 6,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkFilled: {
    // Feather doesn't have a filled bookmark so we colour it amber and rely on the filled stroke weight
  },
  caption: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  hashtags: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
});
