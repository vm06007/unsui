import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { styles } from './DemoReceiptScreen.styles';
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
        <View style={styles.hero}>
          <Pressable
            style={styles.check}
            accessibilityRole="button"
            accessibilityLabel="Receipt saved"
            onPress={replayConfetti}
          >
            <Text style={styles.checkText}>✓</Text>
          </Pressable>
          <Text style={styles.eyebrow}>
            {receipt.status === 'confirmed'
              ? 'TRANSFER CONFIRMED'
              : 'REFUND REQUEST RECORDED'}
          </Text>
          <Text accessibilityRole="header" style={styles.title}>
            A little goes further.
          </Text>
          <Text style={styles.amount}>
            {receipt.status === 'confirmed'
              ? receipt.estimatedCrypto
              : Number(receipt.estimatedCrypto).toFixed(
                  receipt.network === 'ethereum' ? 6 : 4,
                )}{' '}
            {receipt.network === 'mizuhiki' && !receipt.payoutAsset
              ? 'MIZU'
              : PAYOUT_NETWORKS[receipt.network].asset}
          </Text>
          <Text style={styles.payoutNote}>
            {receipt.status === 'confirmed'
              ? `Sent on ${
                  PAYOUT_NETWORKS[receipt.network].name
                } mainnet · after the 2% service fee`
              : 'Estimated payout · after the 2% service fee'}
          </Text>
        </View>
        <View style={styles.reference}>
          <Text style={styles.receiptLabel}>RECEIPT REFERENCE</Text>
          <Text selectable style={styles.digest}>
            {receipt.id}
          </Text>
        </View>
        {receipt.status === 'confirmed' && receipt.transactionDigest && (
          <View style={styles.reference}>
            <Text style={styles.receiptLabel}>TRANSACTION HASH</Text>
            <Text selectable style={styles.digest}>
              {receipt.transactionDigest}
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`View transaction on ${
                receipt.network === 'ethereum'
                  ? 'Etherscan'
                  : receipt.network === 'mizuhiki'
                  ? 'Blockscout'
                  : 'SuiVision'
              }`}
              onPress={() =>
                Linking.openURL(
                  `https://${
                    receipt.network === 'ethereum'
                      ? 'etherscan.io/tx'
                      : receipt.network === 'mizuhiki'
                      ? 'awaji.blockscout.com/tx'
                      : 'suivision.xyz/txblock'
                  }/${receipt.transactionDigest}`,
                ).catch(() => {})
              }
            >
              <Text style={styles.label}>
                View on{' '}
                {receipt.network === 'ethereum'
                  ? 'Etherscan'
                  : receipt.network === 'mizuhiki'
                  ? 'Blockscout'
                  : 'SuiVision'}{' '}
                ↗
              </Text>
            </Pressable>
          </View>
        )}
        <View style={styles.panel}>
          <Row
            label="Human check"
            value={
              receipt.humanCheck === 'bypassed'
                ? 'Bypassed for testing'
                : receipt.humanCheck === 'verified'
                ? 'World ID verified'
                : receipt.humanCheck === 'not_required'
                ? 'Not required'
                : 'Not recorded'
            }
          />
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
