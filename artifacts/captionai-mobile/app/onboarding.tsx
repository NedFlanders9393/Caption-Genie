import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDING_KEY } from "@/lib/storage";

const { width } = Dimensions.get("window");

const C = {
  bg: "#FFFDF9",
  darkTile: "#3A3129",
  amber: "#E8B669",
  amberLight: "#FDF3E3",
  text: "#3A3129",
  muted: "#8C7A6B",
  border: "#F0E3D3",
  white: "#FFFFFF",
};

type Slide = {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  bullets?: { icon: string; text: string }[];
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: "zap",
    iconBg: C.darkTile,
    iconColor: C.amber,
    title: "Welcome to Captly",
    subtitle: "AI-powered captions crafted for your brand — in seconds.",
    bullets: [
      { icon: "zap", text: "Generate captions for any platform" },
      { icon: "target", text: "Personalized to your brand voice" },
      { icon: "hash", text: "Hashtag suggestions built in" },
    ],
  },
  {
    id: "how",
    icon: "layers",
    iconBg: C.amberLight,
    iconColor: C.amber,
    title: "How it works",
    subtitle: "Three steps from idea to caption-ready.",
    bullets: [
      { icon: "edit-3", text: "Describe your post in a few words" },
      { icon: "sliders", text: "Pick your tone, platform & style" },
      { icon: "copy", text: "Copy your caption and post it" },
    ],
  },
  {
    id: "ready",
    icon: "star",
    iconBg: C.amberLight,
    iconColor: C.amber,
    title: "You're all set",
    subtitle: "Start free — upgrade anytime when you're ready.",
    bullets: [
      { icon: "gift", text: "Free plan: 10 captions per month" },
      { icon: "zap", text: "Pro plan: unlimited captions" },
      { icon: "user", text: "Set up Brand Voice to personalize every caption" },
    ],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

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

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Skip button */}
      {!isLast && (
        <Pressable onPress={handleSkip} style={styles.skipBtn} hitSlop={12}>
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
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
        renderItem={({ item }) => <SlideView slide={item} />}
        style={styles.flatList}
      />

      {/* Bottom controls */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
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

        {/* CTA button */}
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          onPress={handleNext}
        >
          <Text style={styles.ctaText}>
            {isLast ? "Get Started" : "Next"}
          </Text>
          <Feather
            name={isLast ? "arrow-right" : "chevron-right"}
            size={18}
            color={C.darkTile}
          />
        </Pressable>
      </View>
    </View>
  );
}

function SlideView({ slide }: { slide: Slide }) {
  return (
    <View style={styles.slide}>
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: slide.iconBg }]}>
        <Feather name={slide.icon as any} size={40} color={slide.iconColor} />
      </View>

      {/* Text */}
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.subtitle}>{slide.subtitle}</Text>

      {/* Bullets */}
      {slide.bullets && (
        <View style={styles.bulletCard}>
          {slide.bullets.map((b, i) => (
            <View key={i} style={[styles.bulletRow, i > 0 && styles.bulletBorder]}>
              <View style={styles.bulletIcon}>
                <Feather name={b.icon as any} size={15} color={C.amber} />
              </View>
              <Text style={styles.bulletText}>{b.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 15,
    color: C.muted,
    fontFamily: "Nunito_500Medium",
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Nunito_700Bold",
    color: C.text,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 36,
  },
  bulletCard: {
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
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
    borderRadius: 8,
    backgroundColor: "#FDF3E3",
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontFamily: "Nunito_500Medium",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
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
  ctaBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.amber,
    borderRadius: 14,
    paddingVertical: 16,
  },
  ctaBtnPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Nunito_700Bold",
    color: C.darkTile,
    letterSpacing: -0.2,
  },
});
