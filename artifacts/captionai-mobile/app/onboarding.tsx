import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Animated,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDING_KEY } from "@/lib/storage";

const { width } = Dimensions.get("window");

const C = {
  bg: "#FFFDF9",
  dark: "#3A3129",
  darkDeep: "#241C15",
  amber: "#E8B669",
  amberDeep: "#D89A3F",
  amberLight: "#FDF3E3",
  text: "#3A3129",
  muted: "#8C7A6B",
  border: "#F0E3D3",
  white: "#FFFFFF",
};

type Slide = {
  id: string;
  icon: string;
  tile: [string, string];
  iconColor: string;
  title: string;
  subtitle: string;
  bullets: { icon: string; text: string }[];
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: "zap",
    tile: [C.dark, C.darkDeep],
    iconColor: C.amber,
    title: "Welcome to Captly",
    subtitle: "AI-powered captions crafted for your brand — in seconds.",
    bullets: [
      { icon: "globe", text: "Captions for every social platform" },
      { icon: "target", text: "Tuned to your brand's voice" },
      { icon: "hash", text: "Hashtag suggestions built right in" },
    ],
  },
  {
    id: "how",
    icon: "compass",
    tile: [C.amber, C.amberDeep],
    iconColor: C.white,
    title: "How it works",
    subtitle: "Three quick steps from idea to ready-to-post.",
    bullets: [
      { icon: "edit-3", text: "Describe your post in a few words" },
      { icon: "sliders", text: "Pick your tone, platform & style" },
      { icon: "copy", text: "Copy your caption and share it" },
    ],
  },
  {
    id: "tools",
    icon: "grid",
    tile: [C.dark, C.darkDeep],
    iconColor: C.amber,
    title: "More than just captions",
    subtitle: "A full toolkit to make every post perform.",
    bullets: [
      { icon: "refresh-cw", text: "Remix any caption in a single tap" },
      { icon: "clock", text: "See the best time to post" },
      { icon: "hash", text: "Generate grouped, on-trend hashtags" },
      { icon: "bookmark", text: "Save favorites & revisit your history" },
    ],
  },
  {
    id: "ready",
    icon: "star",
    tile: [C.amber, C.amberDeep],
    iconColor: C.white,
    title: "You're all set",
    subtitle: "Start free — upgrade anytime when you're ready.",
    bullets: [
      { icon: "gift", text: "Free: 10 captions every month" },
      { icon: "zap", text: "Pro: 150 captions every month" },
      { icon: "user", text: "Set a Brand Voice to personalize them all" },
    ],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slide: slideParam } = useLocalSearchParams<{ slide?: string }>();
  const initialIndex = Math.min(
    Math.max(parseInt(slideParam ?? "0", 10) || 0, 0),
    SLIDES.length - 1
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(initialIndex * width)).current;

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  };

  const isLast = activeIndex === SLIDES.length - 1;

  const blobShift = scrollX.interpolate({
    inputRange: [0, width * Math.max(1, SLIDES.length - 1)],
    outputRange: [0, -70],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.root}>
      {/* Decorative parallax blobs */}
      <Animated.View
        style={[styles.blobTop, { transform: [{ translateX: blobShift }] }]}
      />
      <Animated.View
        style={[
          styles.blobBottom,
          { transform: [{ translateX: Animated.multiply(blobShift, -1) }] },
        ]}
      />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Skip */}
        {!isLast && (
          <Pressable onPress={handleFinish} style={styles.skipBtn} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(e) => {
            setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          renderItem={({ item, index }) => (
            <SlideView slide={item} index={index} scrollX={scrollX} />
          )}
          style={styles.flatList}
        />

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 26, 8],
                extrapolate: "clamp",
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.25, 1, 0.25],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={i}
                  style={[styles.dot, { width: dotWidth, opacity }]}
                />
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [styles.ctaWrap, pressed && styles.ctaPressed]}
            onPress={handleNext}
          >
            <LinearGradient
              colors={[C.amber, C.amberDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaBtn}
            >
              <Text style={styles.ctaText}>{isLast ? "Get Started" : "Next"}</Text>
              <Feather
                name={isLast ? "arrow-right" : "chevron-right"}
                size={18}
                color={C.dark}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SlideView({
  slide,
  index,
  scrollX,
}: {
  slide: Slide;
  index: number;
  scrollX: Animated.Value;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const iconScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
    extrapolate: "clamp",
  });
  const contentOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: "clamp",
  });
  const contentTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [40, 0, 40],
    extrapolate: "clamp",
  });

  return (
    <ScrollView
      style={styles.slideScroll}
      contentContainerStyle={styles.slide}
      showsVerticalScrollIndicator={false}
    >
      {/* Icon with glow */}
      <Animated.View
        style={[
          styles.iconGlow,
          { opacity: contentOpacity, transform: [{ scale: iconScale }] },
        ]}
      >
        <View style={styles.glowRing} />
        <LinearGradient
          colors={slide.tile}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Feather name={slide.icon as any} size={40} color={slide.iconColor} />
        </LinearGradient>
      </Animated.View>

      {/* Text + bullets */}
      <Animated.View
        style={[
          styles.contentBlock,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslate }],
          },
        ]}
      >
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>

        <View style={styles.bulletCard}>
          {slide.bullets.map((b, i) => (
            <View key={i} style={[styles.bulletRow, i > 0 && styles.bulletBorder]}>
              <View style={styles.bulletIcon}>
                <Feather name={b.icon as any} size={15} color={C.amberDeep} />
              </View>
              <Text style={styles.bulletText}>{b.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    overflow: "hidden",
  },
  blobTop: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: C.amberLight,
    opacity: 0.7,
  },
  blobBottom: {
    position: "absolute",
    bottom: -140,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: C.amberLight,
    opacity: 0.5,
  },
  skipBtn: {
    position: "absolute",
    top: 8,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    color: C.muted,
    fontFamily: "Nunito_600SemiBold",
  },
  flatList: {
    flex: 1,
  },
  slideScroll: {
    width,
    flex: 1,
  },
  slide: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  iconGlow: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  glowRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.amberLight,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.darkDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  contentBlock: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 29,
    fontFamily: "Nunito_800ExtraBold",
    color: C.text,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: "Nunito_500Medium",
    paddingHorizontal: 8,
  },
  bulletCard: {
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: C.darkDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  bulletBorder: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.amberLight,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontFamily: "Nunito_600SemiBold",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 22,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.amber,
  },
  ctaWrap: {
    width: "100%",
    borderRadius: 16,
    shadowColor: C.amberDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
    color: C.dark,
    letterSpacing: -0.2,
  },
});
