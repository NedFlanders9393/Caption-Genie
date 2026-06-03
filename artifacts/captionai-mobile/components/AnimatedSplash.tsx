import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

const BG = "#FFFDF9";
const BOLT_COLOR = "#E8B669";

interface Props {
  onFinish: () => void;
  /** When true (and the minimum display time has elapsed), the splash fades out. */
  ready?: boolean;
  /** Minimum time the splash stays visible so the brand mark always registers. */
  minDurationMs?: number;
  /** Hard cap — the splash dismisses even if `ready` never turns true (e.g. offline). */
  maxDurationMs?: number;
}

export default function AnimatedSplash({
  onFinish,
  ready = true,
  minDurationMs = 700,
  maxDurationMs = 4500,
}: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [minElapsed, setMinElapsed] = useState(false);
  const finishedRef = useRef(false);

  const fadeOut = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => onFinish());
  }, [opacity, onFinish]);

  // Continuous spin — one full rotation every 4 seconds.
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [rotation]);

  // Minimum visible duration.
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => clearTimeout(t);
  }, [minDurationMs]);

  // Hard fallback so the splash can never hang if `ready` never arrives.
  useEffect(() => {
    const t = setTimeout(fadeOut, maxDurationMs);
    return () => clearTimeout(t);
  }, [fadeOut, maxDurationMs]);

  // Dismiss as soon as the app is ready AND the minimum time has passed.
  useEffect(() => {
    if (ready && minElapsed) fadeOut();
  }, [ready, minElapsed, fadeOut]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.iconWrap}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="zap" size={160} color={BOLT_COLOR} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
