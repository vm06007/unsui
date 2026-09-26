import React, { useRef } from 'react';
import {
  Platform,
  Alert,
  ToastAndroid,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { demoLedger } from '../lib/ledger';
import BrandMark from '../components/BrandMark';
import AppMenu from '../components/AppMenu';
import TransitRoute from '../components/TransitRoute';
import ScanSheet from '../components/ScanSheet';
export default function HomeScreen({
  scanning,
  onScan,
  onCancel,
  onDemo,
  onReceipts,
  onReset,
  message,
}: {
  scanning: boolean;
  onScan: () => void;
  onCancel: () => void;
  onDemo: () => void;
  onReceipts?: () => void;
  onReset: () => void;
  message: string;
}) {
  const scroll = useRef<ScrollView>(null);
  const compact = useWindowDimensions().height < 600;
  const taps = useRef({ count: 0, time: 0 });
  const resetting = useRef(false);
  const handleLogoTap = async () => {
    if (!__DEV__ || scanning || resetting.current) return;
    const now = Date.now();
    const count = now - taps.current.time < 1500 ? taps.current.count + 1 : 1;
    taps.current = { count, time: now };
    if (count < 3) return;
    taps.current.count = 0;
    resetting.current = true;
    try {
      const cleared = await demoLedger.reset();
      if (cleared !== false) onReset();
      if (Platform.OS === 'android')
        ToastAndroid.show('ETHGlobal Tokyo 2026', ToastAndroid.SHORT);
      else Alert.alert('UnSui', 'ETHGlobal Tokyo 2026');
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : 'Could not reset the ledger. Try again.';
      if (Platform.OS === 'android') ToastAndroid.show(text, ToastAndroid.LONG);
      else Alert.alert('Reset failed', text);
    } finally {
      resetting.current = false;
    }
  };
  return (
    <View style={styles.container}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <View style={[styles.header, compact && styles.compactHeader]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="UnSui"
            onPress={handleLogoTap}
            activeOpacity={0.8}
          >
            <BrandMark />
          </TouchableOpacity>
          <AppMenu
            disabled={scanning}
            onHome={() => {
              scroll.current?.scrollTo({ y: 0, animated: true });
            }}
            onDemo={onDemo}
            onReceipts={onReceipts}
          />
        </View>
        <Text style={styles.eyebrow}>TRANSIT CARD → CRYPTO WALLET</Text>
        <Text style={[styles.title, compact && styles.compactTitle]}>
          Leftover yen.{'\n'}Straight to your wallet.
        </Text>
        <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>
          Scan your transit card, check what’s left, and request a SUI or ETH
          payout to your crypto wallet.
        </Text>
        <View
          style={[styles.transitCard, compact && styles.compactCard]}
          accessible
          accessibilityLabel="Transit card illustration"
        >
          <View style={styles.cardTop}>
            <Text style={styles.cardBrand}>UnSui / transit</Text>
          </View>
          <TransitRoute active={!scanning} compact={compact} />
          <Text style={styles.cardTitle}>Next stop: possibility.</Text>
          <Text style={styles.cardCaption}>SUICA / ICOCA / PASMO</Text>
        </View>
        <Text style={styles.flowHeading}>
          Three steps. One new destination.
        </Text>
        {[
          {
            number: '01',
            title: 'Scan your card',
            detail:
              'Hold your card against your phone to see its balance and history.',
          },
          {
            number: '02',
            title: 'Choose your destination',
            detail:
              'Request a refund, choose SUI or ETH, and add your wallet address.',
          },
          {
            number: '03',
            title: 'Tap again to confirm',
            detail:
              'Scan the same card once more to confirm and view your receipt.',
          },
        ].map(step => (
          <View
            key={step.number}
            style={[
              styles.instruction,
              step.number === '03' && styles.lastInstruction,
            ]}
          >
            <Text style={styles.stepNumber}>{step.number}</Text>
            <View style={styles.instructionText}>
              <Text style={styles.instructionTitle}>{step.title}</Text>
              <Text style={styles.instructionBody}>{step.detail}</Text>
            </View>
          </View>
        ))}

        {Platform.OS === 'ios' && (
          <Text style={styles.note}>
            iOS FeliCa reading requires an Apple-granted entitlement -- if this
            fails, the entitlement request may not have cleared yet.
          </Text>
        )}
        {!!message && (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Scan transit card"
          disabled={scanning}
          onPress={onScan}
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={styles.cardIcon}
          >
            <View style={styles.cardStripe} />
            <View style={styles.cardChip} />
          </View>
          <Text style={styles.buttonText}>
            {scanning ? 'Scanning…' : 'Scan your card'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScanSheet visible={scanning} onCancel={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  compactHeader: { marginBottom: 14 },
  compactTitle: { fontSize: 26, lineHeight: 30 },
  compactSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 14,
  },
  compactCard: { padding: 16, marginBottom: 18 },
  compactArt: { height: 28 },
  container: { flex: 1, backgroundColor: '#F5F6F0' },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#F5F6F0',
  },
  content: { flexGrow: 1, padding: 24, paddingBottom: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.4,
    color: '#172D29',
  },
  brandDot: { color: '#24856B' },
  badge: {
    backgroundColor: '#E5EAE1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: '#405B50',
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: '#64766A',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -1.7,
    fontWeight: '700',
    color: '#172D29',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: '#68776F',
    marginTop: 14,
    marginBottom: 20,
  },
  transitCard: {
    backgroundColor: '#173E35',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    marginBottom: 26,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: { color: '#E5F1D5', fontSize: 14, fontWeight: '600' },
  cardSymbol: { color: '#CBEE9F', fontSize: 23, letterSpacing: -3 },
  cardArt: { height: 62, justifyContent: 'center' },
  routeLine: { height: 1, backgroundColor: '#688975', width: '100%' },
  routeDot: {
    position: 'absolute',
    left: 12,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#CBEE9F',
  },
  routeEnd: {
    position: 'absolute',
    right: 12,
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 7,
    borderColor: '#CBEE9F',
    backgroundColor: '#173E35',
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#F5F6F0',
  },
  cardCaption: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#A9C2B2',
    marginTop: 18,
  },
  flowHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#173E35',
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  instruction: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  lastInstruction: { marginBottom: 0 },
  stepNumber: {
    fontSize: 12,
    color: '#46664D',
    backgroundColor: '#E5EBDD',
    borderRadius: 16,
    width: 34,
    height: 34,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '700',
  },
  instructionText: { flex: 1 },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#172D29',
    marginBottom: 5,
  },
  instructionBody: { fontSize: 13, lineHeight: 20, color: '#68776F' },
  button: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#CBEE9F',
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  cardIcon: {
    width: 26,
    height: 19,
    borderWidth: 1.5,
    borderColor: '#173E35',
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardStripe: { height: 3, backgroundColor: '#173E35', marginTop: 3 },
  cardChip: {
    width: 5,
    height: 3,
    backgroundColor: '#173E35',
    marginTop: 3,
    marginLeft: 3,
    borderRadius: 1,
  },
  buttonText: { color: '#173E35', fontSize: 16, fontWeight: '700' },
  devButton: { paddingVertical: 10, alignItems: 'center' },
  devButtonText: { color: '#68776F', fontSize: 12 },
  error: { color: '#B74136', marginTop: 12, textAlign: 'center' },
  note: {
    color: '#68776F',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
    textAlign: 'center',
  },
});
