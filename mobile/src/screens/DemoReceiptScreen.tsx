import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SuccessConfetti from '../components/SuccessConfetti';
import { DemoReceipt } from '../lib/demoLedger';
import { PAYOUT_NETWORKS } from '../lib/refundQuote';
export default function DemoReceiptScreen({
  receipt,
  onClose,
}: {
  receipt: DemoReceipt;
  onClose: () => void;
}) {
  const [replay, setReplay] = useState(0);
  const taps = useRef({ count: 0, time: 0 });
  const replayConfetti = () => {
    const now = Date.now();
    const count = now - taps.current.time < 1500 ? taps.current.count + 1 : 1;
    taps.current = { count, time: now };
    if (count === 3) {
      taps.current.count = 0;
      setReplay(value => value + 1);
    }
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.badge}>REFUND REQUEST RECORDED</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Receipt saved"
          onPress={replayConfetti}
        >
          <Text style={styles.check}>✓</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Your receipt.
        </Text>
        <Text style={styles.note}>
          Your refund request and destination have been recorded.
        </Text>
        <View style={styles.panel}>
          <Text style={styles.label}>Estimated crypto payout</Text>
          <Text style={styles.amount}>
            {receipt.estimatedCrypto} {PAYOUT_NETWORKS[receipt.network].asset}
          </Text>
          <Text style={styles.note}>After the 2% service fee</Text>
        </View>
        <View style={styles.panel}>
          <Row label="Receipt reference" value={receipt.id} />
          <Row
            label="Recorded at"
            value={new Date(receipt.createdAt).toLocaleString()}
          />
          <Row label="Card" value={`•••• ${receipt.cardId.slice(-4)}`} />
          <Row
            label="Refund amount"
            value={`¥${receipt.amountJpy.toLocaleString('en-US')}`}
          />
          <Row
            label="Service fee"
            value={`¥${receipt.feeJpy.toLocaleString('en-US')}`}
          />
          <Row
            label="Amount converted"
            value={`¥${receipt.netJpy.toLocaleString('en-US')}`}
          />
          <Row
            label="Network"
            value={
              receipt.network === 'mizuhiki'
                ? 'Mizuhiki · Awaji Testnet'
                : PAYOUT_NETWORKS[receipt.network].name
            }
          />
          <Row label="Recipient wallet" value={receipt.recipient} />
          <Row
            label="Available balance after this refund"
            value={`¥${receipt.remainingDemoJpy.toLocaleString('en-US')}`}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close receipt"
          onPress={onClose}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to card</Text>
        </Pressable>
      </ScrollView>
      <SuccessConfetti key={replay} />
    </View>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.note}>{label}</Text>
      <Text selectable style={styles.label}>
        {value}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  check: { fontSize: 48, color: '#173E35', textAlign: 'center' },
  content: { gap: 22, paddingVertical: 28 },
  badge: { fontSize: 12, color: '#385131', fontWeight: '700' },
  title: { fontSize: 34, color: '#214A37', fontWeight: '700' },
  note: { fontSize: 14, lineHeight: 22, color: '#687667' },
  label: { fontSize: 17, lineHeight: 25, color: '#214A37', fontWeight: '600' },
  amount: { fontSize: 32, fontWeight: '700', color: '#214A37' },
  panel: { gap: 18, padding: 20, borderRadius: 18, backgroundColor: '#E9EFDD' },
  row: { gap: 4 },
  button: {
    padding: 18,
    backgroundColor: '#214A37',
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
