import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = ['#CBEE9F', '#24856B', '#D4BB74', '#86BAA2'];
export default function SuccessConfetti() {
  const progress = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  useEffect(() => {
    let active = true;
    let started = false;
    const update = (reduceMotion: boolean) => {
      if (!active) return;
      if (reduceMotion) {
        progress.stopAnimation();
        progress.setValue(0);
        return;
      }
      if (started) return;
      started = true;
      Animated.timing(progress, {
        toValue: 1,
        duration: 1900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then(update)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      update,
    );
    return () => {
      active = false;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [progress]);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.overlay}
    >
      {Array.from({ length: 18 }, (_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.piece,
            index % 3 === 0 ? styles.roundPiece : styles.squarePiece,
            {
              left: `${5 + ((index * 31) % 90)}%`,
              backgroundColor: COLORS[index % COLORS.length],
              opacity: progress.interpolate({
                inputRange: [0, 0.08, 0.72, 1],
                outputRange: [0, 0.9, 0.7, 0],
              }),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      -35 - (index % 5) * 18,
                      height * (0.55 + (index % 4) * 0.1),
                    ],
                  }),
                },
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, index % 2 ? 30 : -30],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      `${index * 23}deg`,
                      `${index * 23 + (index % 2 ? 240 : -240)}deg`,
                    ],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, overflow: 'hidden', zIndex: 10 },
  roundPiece: { borderRadius: 4 },
  squarePiece: { borderRadius: 1 },
  piece: { position: 'absolute', top: 0, width: 6, height: 10 },
});
