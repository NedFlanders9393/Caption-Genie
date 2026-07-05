import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
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
import { useSubscription } from "@/lib/revenuecat";
import Paywall from "@/components/Paywall";

// Max caption length per platform (characters). Used to warn when a caption
// runs past what the platform will actually publish.
const PLATFORM_LIMITS: Record<string, number> = {
  Instagram: 2200,
  Facebook: 63206,
  LinkedIn: 3000,
  TikTok: 2200,
  "Twitter/X": 280,
  Twitter: 280,
  X: 280,
  YouTube: 5000,
  Pinterest: 500,
};

interface Props {
  index: number;
  caption: string;
  hashtags: string;
  platform?: string;
  favoriteId?: string;
  isFavorited?: boolean;
  onFavorite?: () => void;
  onRegenerate?: () => Promise<void>;
  isRegenerating?: boolean;
}

type CopyKind = "all" | "caption" | "hashtags";

export default function CaptionCard({
  index,
  caption,
  hashtags,
  platform,
  favoriteId,
  isFavorited = false,
  onFavorite,
  onRegenerate,
  isRegenerating,
}: Props) {
  const colors = useColors();
  const { isSubscribed } = useSubscription();
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const [shareReady, setShareReady] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // #2 — edit-before-copy. Keep an editable copy of the caption/hashtags in
  // local state, re-synced whenever a fresh caption arrives (e.g. regenerate).
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(caption);
  const [editHashtags, setEditHashtags] = useState(hashtags);

  useEffect(() => {
    setEditCaption(caption);
    setEditHashtags(hashtags);
    setEditing(false);
  }, [caption, hashtags]);

  const cleanCaption = editCaption.trim();
  const cleanHashtags = editHashtags.trim();
  const fullText = cleanHashtags ? `${cleanCaption}\n\n${cleanHashtags}` : cleanCaption;

  // #1 — character count vs platform limit. Counts the caption body only, since
  // hashtags are commonly moved to the first comment (see the copy-hashtags chip).
  const limit = platform ? PLATFORM_LIMITS[platform] : undefined;
  const charCount = cleanCaption.length;
  const overLimit = limit !== undefined && charCount > limit;

  const flashCopied = (kind: CopyKind) => {
    setCopied(kind);
    setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
  };

  const handleCopy = async (kind: CopyKind) => {
    const text = kind === "caption" ? cleanCaption : kind === "hashtags" ? cleanHashtags : fullText;
    if (!text) return;
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    flashCopied(kind);
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
          title: "Caption from Captly",
        },
        {
          // iOS: show the subject field so apps that support it get the title
          subject: "Caption from Captly",
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

  const toggleEditing = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing((e) => !e);
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
    <>
    <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
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
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.secondary, borderRadius: colors.radius / 2 },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.primary }]}>#{index + 1}</Text>
          </View>
          {isSubscribed ? (
            <View style={[styles.premiumBadge, { borderRadius: colors.radius / 2 }]}>
              <Feather name="zap" size={10} color="#B07B2C" />
              <Text style={styles.premiumText}>Premium AI</Text>
            </View>
          ) : null}
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
          <TouchableOpacity onPress={toggleEditing} style={styles.iconBtn} activeOpacity={0.7}>
            <Feather
              name={editing ? "check" : "edit-2"}
              size={16}
              color={editing ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.7}>
            <Feather
              name={shareReady ? "check" : "share-2"}
              size={16}
              color={shareReady ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCopy("all")} style={styles.iconBtn} activeOpacity={0.7}>
            <Feather
              name={copied === "all" ? "check" : "copy"}
              size={16}
              color={copied === "all" ? colors.primary : colors.mutedForeground}
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

      {editing ? (
        <TextInput
          style={[
            styles.editInput,
            {
              color: colors.foreground,
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: colors.radius / 2,
            },
          ]}
          value={editCaption}
          onChangeText={setEditCaption}
          multiline
          textAlignVertical="top"
          placeholder="Caption"
          placeholderTextColor={colors.mutedForeground}
        />
      ) : (
        <Text style={[styles.caption, { color: colors.foreground }]}>{cleanCaption}</Text>
      )}

      {editing ? (
        <TextInput
          style={[
            styles.editInput,
            styles.editHashtags,
            {
              color: colors.primary,
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: colors.radius / 2,
            },
          ]}
          value={editHashtags}
          onChangeText={setEditHashtags}
          multiline
          textAlignVertical="top"
          placeholder="#hashtags"
          placeholderTextColor={colors.mutedForeground}
        />
      ) : cleanHashtags ? (
        <Text style={[styles.hashtags, { color: colors.primary }]}>{cleanHashtags}</Text>
      ) : null}

      {/* Footer: char count + limit (#1) and copy options (#4) */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text
          style={[
            styles.charInfo,
            { color: overLimit ? colors.destructive : colors.mutedForeground },
          ]}
        >
          {charCount.toLocaleString()}
          {limit !== undefined ? ` / ${limit.toLocaleString()}` : ""} chars
          {platform ? ` · ${platform}` : ""}
          {overLimit ? " · over limit" : ""}
        </Text>

        {cleanHashtags ? (
          <View style={styles.copyOptions}>
            <TouchableOpacity
              onPress={() => handleCopy("caption")}
              style={[styles.copyChip, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Feather
                name={copied === "caption" ? "check" : "copy"}
                size={12}
                color={copied === "caption" ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.copyChipText,
                  { color: copied === "caption" ? colors.primary : colors.mutedForeground },
                ]}
              >
                Caption
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCopy("hashtags")}
              style={[styles.copyChip, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Feather
                name={copied === "hashtags" ? "check" : "hash"}
                size={12}
                color={copied === "hashtags" ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.copyChipText,
                  { color: copied === "hashtags" ? colors.primary : colors.mutedForeground },
                ]}
              >
                Hashtags
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
    </>
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F8EFE4",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumText: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#B07B2C",
    letterSpacing: 0.3,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
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
    fontFamily: "Nunito_400Regular",
  },
  hashtags: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Nunito_500Medium",
  },
  editInput: {
    borderWidth: 1.5,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Nunito_400Regular",
    minHeight: 90,
  },
  editHashtags: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Nunito_500Medium",
    minHeight: 56,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  charInfo: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    flexShrink: 1,
  },
  copyOptions: {
    flexDirection: "row",
    gap: 6,
  },
  copyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  copyChipText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
});
