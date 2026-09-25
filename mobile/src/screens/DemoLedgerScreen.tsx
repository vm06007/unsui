import React, { useEffect } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DemoReceipt } from '../lib/demoLedger';
import { PAYOUT_NETWORKS } from '../lib/refundQuote';
export default function DemoLedgerScreen({
  receipts,
  onSelect,
  onClose,
}: {
  receipts: DemoReceipt[];
  onSelect: (receipt: DemoReceipt) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close receipts"
        onPress={onClose}
        style={styles.back}
      >
        <Text style={styles.label}>← Back</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Your receipts.
      </Text>
      <Text style={styles.note}>
        Your recorded refund requests, all in one place.
      </Text>
      {!receipts.length && (
        <Text style={styles.note}>
          No refunds recorded yet. Scan a card to get started.
        </Text>
      )}
      {[...receipts].reverse().map(receipt => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${receipt.id}`}
          key={receipt.id}
          onPress={() => onSelect(receipt)}
          style={styles.card}
        >
          <Text style={styles.label}>{receipt.id} · Recorded</Text>
          <Text style={styles.amount}>
            ¥{receipt.amountJpy.toLocaleString('en-US')} →{' '}
            {receipt.estimatedCrypto} {PAYOUT_NETWORKS[receipt.network].asset}
          </Text>
          <View>
            <Text style={styles.note}>
              {new Date(receipt.createdAt).toLocaleString()}
            </Text>
            <Text style={styles.note}>
              Card •••• {receipt.cardId.slice(-4)} ·{' '}
              {PAYOUT_NETWORKS[receipt.network].name}
            </Text>
          </View>
          <Text style={styles.label}>View receipt →</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { gap: 22, paddingVertical: 24 },
  back: { paddingVertical: 12 },
  title: { fontSize: 34, fontWeight: '700', color: '#214A37' },
  note: { fontSize: 14, lineHeight: 22, color: '#687667' },
  label: { fontSize: 17, fontWeight: '600', color: '#214A37' },
  amount: { fontSize: 22, color: '#214A37' },
  card: { backgroundColor: '#E9EFDD', padding: 20, borderRadius: 18, gap: 12 },
});
