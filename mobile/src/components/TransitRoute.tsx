import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

export default function TransitRoute({
  active = true,
  compact = false,
}: {
  active?: boolean;
  compact?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted) setReduceMotion(value);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    const app = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  useEffect(() => {
    progress.setValue(0);
    if (!active || !foreground || reduceMotion || width <= 92) return;
    const journey = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(progress, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(700),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    journey.start();
    return () => journey.stop();
  }, [active, foreground, progress, reduceMotion, width]);
  const opacity = reduceMotion
    ? 1
    : progress.interpolate({
        inputRange: [0, 0.04, 0.9, 1],
        outputRange: [0, 1, 1, 0],
      });
  return (
    <View
      style={[styles.route, compact && styles.compactRoute]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.line, compact && styles.compactLine]} />
      <View style={[styles.start, compact && styles.compactStart]} />
      <View style={[styles.end, compact && styles.compactEnd]} />
      <Animated.View
        style={[
          styles.train,
          compact && styles.compactTrain,
          {
            opacity,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.max(0, width - 92)],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width={56} height={24} viewBox="0 0 112 48">
          <Path
            d="M6 8H65C77 8 87 16 105 31Q112 38 103 39H8Q3 39 3 34V13Q3 8 6 8Z"
            fill="#F5F8F0"
          />
          <Path d="M72 12Q85 17 94 27H75Z" fill="#365E5A" />
          <Rect x="12" y="14" width="13" height="9" rx="2" fill="#365E5A" />
          <Rect x="31" y="14" width="13" height="9" rx="2" fill="#365E5A" />
          <Rect x="50" y="14" width="13" height="9" rx="2" fill="#365E5A" />
          <Path d="M4 29H86L98 34H4Z" fill="#80BBAC" />
          <Path
            d="M13 41H88"
            stroke="#9EC4AC"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  compactRoute: { height: 38 },
  compactLine: { top: 24 },
  compactStart: { top: 20 },
  compactEnd: { top: 17 },
  compactTrain: { top: 0 },
  route: { height: 54, width: '100%', marginVertical: 3 },
  line: {
    position: 'absolute',
    top: 37,
    height: 1,
    left: 0,
    right: 0,
    backgroundColor: '#688975',
  },
  start: {
    position: 'absolute',
    top: 33,
    left: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#CBEE9F',
  },
  end: {
    position: 'absolute',
    top: 30,
    right: 12,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#CBEE9F',
    backgroundColor: '#173E35',
  },
  train: { position: 'absolute', top: 13, left: 18, width: 56, height: 24 },
});
