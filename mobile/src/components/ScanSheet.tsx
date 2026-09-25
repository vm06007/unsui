import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
const CARD_HEIGHT = 320;
function PulseRing({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(1400 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.45, 0.15, 0],
  });

  return (
    <Animated.View
      style={[iconStyles.pulseRing, { opacity, transform: [{ scale }] }]}
    />
  );
}

// Phone-in-a-circle icon with expanding radar rings, echoing the iOS Core
// NFC "Ready to Scan" sheet's scanning animation.
function ScanIcon() {
  return (
    <View style={iconStyles.container}>
      <PulseRing delay={0} />
      <PulseRing delay={700} />
      <View style={iconStyles.circle}>
        <View style={iconStyles.phone}>
          <View style={iconStyles.phoneShine} />
        </View>
      </View>
    </View>
  );
}

// Mimics the iOS Core NFC "Ready to Scan" card: slides up from below the
// screen into a floating, all-corners-rounded card over a dimmed backdrop.
export default function ScanSheet({
  visible,
  onCancel,
  title = 'Ready to Scan',
  subtitle = 'Hold your card against the back of your phone',
}: {
  visible: boolean;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={sheetStyles.overlay}>
        <View style={sheetStyles.backdrop} />
        <View style={sheetStyles.card} accessibilityViewIsModal>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close scan"
            style={sheetStyles.close}
            onPress={onCancel}
          >
            <Text style={sheetStyles.closeText}>×</Text>
          </TouchableOpacity>
          <Text style={sheetStyles.title}>{title}</Text>
          <Text style={sheetStyles.subtitle}>{subtitle}</Text>
          <View style={sheetStyles.iconArea}>
            <ScanIcon />
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel scan"
            onPress={onCancel}
            style={sheetStyles.cancel}
          >
            <Text style={sheetStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    height: CARD_HEIGHT,
    backgroundColor: 'white',
    borderRadius: 24,
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 18, color: '#6b7280', lineHeight: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6, color: '#172D29' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  iconArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: { color: '#111827', fontSize: 16, fontWeight: '600' },
});

const iconStyles = StyleSheet.create({
  container: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#24856B',
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#24856B',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 26,
    height: 42,
    borderWidth: 2,
    borderColor: '#24856B',
    borderRadius: 5,
    overflow: 'hidden',
  },
  phoneShine: {
    position: 'absolute',
    bottom: -8,
    left: -12,
    width: 26,
    height: 18,
    backgroundColor: '#CBEE9F',
    transform: [{ rotate: '45deg' }],
  },
});
