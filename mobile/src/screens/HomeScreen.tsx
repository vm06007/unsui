import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import TransitRoute from '../components/TransitRoute';
import ScanSheet from '../components/ScanSheet';
export default function HomeScreen({
  scanning,
  onScan,
  onCancel,
  onDemo,
  message,
}: {
  scanning: boolean;
  onScan: () => void;
  onCancel: () => void;
  onDemo: () => void;
  message: string;
}) {
  return (
    <View style={s.flex}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>TRANSIT CARD → CRYPTO WALLET</Text>
        <Text accessibilityRole="header" style={s.title}>
          Leftover yen.{'\n'}Straight to your wallet.
        </Text>
        <Text style={s.subtitle}>
          Scan your Suica card, check what’s left, and preview a refund to your
          crypto wallet.
        </Text>
        <View
          style={s.card}
          accessible
          accessibilityLabel="Transit card illustration"
        >
          <Text style={s.cardBrand}>UnSui / transit</Text>
          <TransitRoute active={!scanning} />
          <Text style={s.cardTitle}>Next stop: possibility.</Text>
          <Text style={s.cardCaption}>SUICA · DEMO REFUNDS</Text>
        </View>
        <Text style={s.heading}>Three steps. One new destination.</Text>
        {[
          'Scan your card|See its balance and recent journeys.',
          'Choose your destination|Choose Sui, Ethereum or Mizuhiki and add your wallet.',
          'Tap again to confirm|Re-scan the same card and save your demo receipt.',
        ].map((step, index) => (
          <View key={step} style={s.step}>
            <Text style={s.number}>0{index + 1}</Text>
            <View style={s.flex}>
              <Text style={s.stepTitle}>{step.split('|')[0]}</Text>
              <Text style={s.detail}>{step.split('|')[1]}</Text>
            </View>
          </View>
        ))}
        {!!message && (
          <Text accessibilityRole="alert" style={s.error}>
            {message}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try sample card"
          disabled={scanning}
          onPress={onDemo}
          style={s.demo}
        >
          <Text style={s.demoText}>No card nearby? Try the demo →</Text>
        </Pressable>
      </ScrollView>
      <View style={s.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan transit card"
          disabled={scanning}
          onPress={onScan}
          style={s.button}
        >
          <Text style={s.buttonText}>Scan your card</Text>
        </Pressable>
        <Text style={s.caption}>
          Read-only NFC · no funds sent in this build
        </Text>
      </View>
      <ScanSheet visible={scanning} onCancel={onCancel} />
    </View>
  );
}
const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 12 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: '#64766A',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.5,
    fontWeight: '700',
    color: '#172D29',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#68776F',
    marginTop: 14,
    marginBottom: 22,
  },
  card: {
    backgroundColor: '#173E35',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardBrand: { color: '#E5F1D5', fontSize: 14, fontWeight: '600' },
  cardTitle: {
    color: '#F5F6F0',
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  cardCaption: {
    color: '#CBEE9F',
    fontSize: 10,
    letterSpacing: 1.6,
    marginTop: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#173E35',
    marginBottom: 14,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E1E5DC',
  },
  number: { fontSize: 14, color: '#657B59', paddingTop: 3 },
  stepTitle: { fontSize: 17, fontWeight: '600', color: '#172D29' },
  detail: { fontSize: 15, lineHeight: 22, color: '#68776F', marginTop: 5 },
  footer: { paddingTop: 12, paddingBottom: 12 },
  button: {
    backgroundColor: '#173E35',
    borderRadius: 16,
    padding: 19,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  caption: {
    fontSize: 12,
    color: '#68776F',
    textAlign: 'center',
    marginTop: 10,
  },
  demo: { paddingVertical: 18 },
  demoText: { fontSize: 16, color: '#173E35', fontWeight: '600' },
  error: { fontSize: 16, lineHeight: 24, color: '#85472F', marginTop: 12 },
});
