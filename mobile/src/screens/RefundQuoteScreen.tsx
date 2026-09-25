import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  amountError,
  createDemoQuote,
  PAYOUT_NETWORKS,
  PayoutNetwork,
  recipientError,
  RefundQuote,
} from '../lib/refundQuote';

import { readCard, cancelScan } from '../lib/suica';
import { demoLedger } from '../lib/localDemoLedger';
import { DemoReceipt } from '../lib/demoLedger';
type Props = {
  balanceJpy: number;
  scannedBalanceJpy: number;
  cardId: string;
  onClose: () => void;
  onRecorded: (receipt: DemoReceipt) => void;
};
const yen = (value: number) =>
  `¥${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function RefundQuoteScreen({
  balanceJpy,
  scannedBalanceJpy,
  cardId,
  onClose,
  onRecorded,
}: Props) {
  const [amount, setAmount] = useState(String(balanceJpy));
  const [network, setNetwork] = useState<PayoutNetwork>('sui');
  const [recipient, setRecipient] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [quote, setQuote] = useState<RefundQuote | null>(null);
  const scroll = useRef<ScrollView>(null);
  const [phase, setPhase] = useState<
    'idle' | 'confirming' | 'cancelling' | 'saving'
  >('idle');
  const [confirmationError, setConfirmationError] = useState('');
  const active = useRef(false);
  const mounted = useRef(true);
  const saving = useRef(false);
  const cancelled = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const cancelConfirmation = (
    reason = 'Confirmation cancelled. No new refund was recorded.',
  ) => {
    if (!active.current || saving.current) return;
    cancelled.current = true;
    setConfirmationError(reason);
    setPhase('cancelling');
    cancelScan().catch(() => {});
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelled.current = true;
      if (active.current && !saving.current) cancelScan().catch(() => {});
    };
  }, []);
  const confirm = async () => {
    if (!quote || active.current) return;
    active.current = true;
    cancelled.current = false;
    saving.current = false;
    setConfirmationError('');
    setPhase('confirming');
    const fingerprint = JSON.stringify(quote);
    if (request.current?.fingerprint !== fingerprint) {
      request.current = {
        fingerprint,
        id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    }
    const requestId = request.current.id;
    const timeout = setTimeout(
      () =>
        cancelConfirmation(
          'Confirmation timed out. Hold the same card still and retry.',
        ),
      25000,
    );
    try {
      const confirmed = await readCard(
        () => cancelled.current || !mounted.current,
        { history: false },
      );
      clearTimeout(timeout);
      if (cancelled.current || !mounted.current) return;
      if (confirmed.idm.toLowerCase() !== cardId.toLowerCase())
        throw Error('That is a different card. Re-scan the original card.');
      if (confirmed.balanceJpy !== scannedBalanceJpy)
        throw Error(
          'The card balance changed. Go back to the card screen and scan it again.',
        );
      saving.current = true;
      setPhase('saving');
      const receipt = await demoLedger.record({
        requestId,
        quote,
        cardId,
        scannedBalanceJpy,
        confirmedCardId: confirmed.idm,
        confirmedBalanceJpy: confirmed.balanceJpy,
      });
      if (mounted.current) onRecorded(receipt);
    } catch (error) {
      if (mounted.current && !cancelled.current)
        setConfirmationError(
          error instanceof Error
            ? error.message
            : 'Could not record the demo refund. Please retry.',
        );
    } finally {
      clearTimeout(timeout);
      active.current = false;
      saving.current = false;
      if (mounted.current) setPhase('idle');
    }
  };
  const amountIssue = amountError(amount, balanceJpy);
  const recipientIssue = recipientError(recipient, network);
  const back = () => {
    if (active.current) {
      cancelConfirmation();
      return;
    }
    setConfirmationError('');
    Keyboard.dismiss();
    if (quote) setQuote(null);
    else onClose();
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (active.current) {
          cancelConfirmation();
          return true;
        }
        setConfirmationError('');
        Keyboard.dismiss();
        scroll.current?.scrollTo({ y: 0, animated: false });
        if (quote) setQuote(null);
        else onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [quote, onClose]);
  const review = () => {
    setAttempted(true);
    if (amountIssue || recipientIssue) return;
    Keyboard.dismiss();
    setQuote(createDemoQuote(amount, balanceJpy, network, recipient));
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const payout = PAYOUT_NETWORKS[quote?.network ?? network];
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={quote ? 'Edit quote' : 'Back to card'}
          onPress={back}
          disabled={phase !== 'idle'}
          accessibilityState={{ disabled: phase !== 'idle' }}
          style={styles.back}
        >
          <Text style={styles.backText}>
            ← {quote ? 'Edit quote' : 'Back to card'}
          </Text>
        </Pressable>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEMO QUOTE · NO FUNDS SENT</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {quote ? 'Your refund estimate.' : 'Where next for your yen?'}
        </Text>
        <Text style={styles.description}>
          {quote
            ? 'Review the amount, destination and estimated payout.'
            : 'Choose an amount and a wallet to preview your crypto payout.'}
        </Text>
        {quote ? (
          <>
            <View style={styles.estimate}>
              <Text style={styles.label}>Estimated crypto payout</Text>
              <Text testID="quote-payout" style={styles.payout}>
                {quote.estimatedCrypto} {payout.asset}
              </Text>
              <Text style={styles.note}>After the 2% demo service fee</Text>
            </View>
            <View style={styles.panel}>
              <Detail label="Refund amount" value={yen(quote.amountJpy)} />
              <Detail label="Demo service fee · 2%" value={yen(quote.feeJpy)} />
              <Detail label="Amount converted" value={yen(quote.netJpy)} />
              <Detail
                label="Network"
                value={
                  quote.network === 'mizuhiki'
                    ? 'Mizuhiki · Awaji Testnet'
                    : payout.name
                }
              />
              <Detail
                label="Illustrative rate"
                value={`1 ${payout.asset} = ${yen(payout.yenPerAsset)}`}
              />
              <View style={styles.field}>
                <Text style={styles.label}>Recipient wallet</Text>
                <Text
                  selectable
                  testID="quote-recipient"
                  style={styles.address}
                >
                  {quote.recipient}
                </Text>
              </View>
            </View>
            <Text style={styles.note}>
              This is a local estimate, not a live offer. No card debit, wallet
              verification or blockchain transaction has taken place. Network
              fees are not included.
            </Text>
            <Text style={styles.note}>
              Re-scan the same card to save a simulated refund on this phone.
              This reduces only your remaining demo allowance, across all
              networks.
            </Text>
            {!!confirmationError && (
              <Text accessibilityRole="alert" style={styles.error}>
                {confirmationError}
              </Text>
            )}
            {phase !== 'idle' && (
              <View style={styles.field}>
                <ActivityIndicator
                  color="#214A37"
                  accessibilityLabel={
                    phase === 'saving'
                      ? 'Saving demo receipt'
                      : 'Confirming transit card'
                  }
                />
                <Text accessibilityLiveRegion="polite" style={styles.note}>
                  {phase === 'saving'
                    ? 'Saving the receipt on this phone…'
                    : phase === 'cancelling'
                    ? 'Closing the NFC session…'
                    : 'Hold the original card near your phone. Its balance must be unchanged.'}
                </Text>
                {phase === 'confirming' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel confirmation"
                    style={styles.back}
                    onPress={() => cancelConfirmation()}
                  >
                    <Text style={styles.backText}>Cancel confirmation</Text>
                  </Pressable>
                )}
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm simulated refund"
              style={styles.primary}
              disabled={phase !== 'idle'}
              accessibilityState={{ disabled: phase !== 'idle' }}
              onPress={confirm}
            >
              <Text style={styles.primaryText}>
                {confirmationError
                  ? 'Retry confirmation'
                  : 'Re-scan & confirm demo refund'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.panel}>
              <Text style={styles.label}>Amount to refund · JPY</Text>
              <Text style={styles.note}>
                Available demo balance: {yen(balanceJpy)} · Card reads{' '}
                {yen(scannedBalanceJpy)}
              </Text>
              <TextInput
                testID="refund-amount"
                accessibilityLabel="Refund amount in yen"
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                maxLength={8}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setAmount(String(balanceJpy))}
                style={styles.back}
              >
                <Text style={styles.backText}>Use available balance</Text>
              </Pressable>
              {attempted && amountIssue && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {amountIssue}
                </Text>
              )}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Payout network</Text>
              {(Object.keys(PAYOUT_NETWORKS) as PayoutNetwork[]).map(key => (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={PAYOUT_NETWORKS[key].name}
                  accessibilityState={{ checked: network === key }}
                  onPress={() => {
                    if (key !== network) {
                      setNetwork(key);
                      setRecipient('');
                      setAttempted(false);
                    }
                  }}
                  style={[styles.network, network === key && styles.selected]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.label}>
                      {PAYOUT_NETWORKS[key].name}
                    </Text>
                    <Text style={styles.note}>
                      {key === 'mizuhiki'
                        ? 'Awaji Testnet · MIZU'
                        : `${PAYOUT_NETWORKS[key].asset} · quote preview`}
                    </Text>
                  </View>
                  <Text style={styles.radio}>
                    {network === key ? '●' : '○'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Recipient wallet address</Text>
              <TextInput
                testID="refund-recipient"
                accessibilityLabel="Recipient wallet address"
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                placeholder="0x…"
                placeholderTextColor="#78856B"
                multiline
                style={[styles.input, styles.addressInput]}
              />
              <Text style={styles.note}>
                Use your {payout.name} address. Switching networks clears this
                field. Only address format is checked; ownership and network
                compatibility are not verified.
              </Text>
              {attempted && recipientIssue && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {recipientIssue}
                </Text>
              )}
            </View>
            <View style={styles.estimate}>
              <Text style={styles.label}>Fixed demo rate</Text>
              <Text style={styles.description}>
                1 {payout.asset} = {yen(payout.yenPerAsset)}
              </Text>
              <Text style={styles.note}>
                A 2% demo service fee is deducted before conversion, so you
                receive slightly less crypto. Network fees are not included.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review demo quote"
              onPress={review}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Review demo quote →</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.note}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: 24, gap: 22 },
  back: { paddingVertical: 12, alignSelf: 'flex-start' },
  backText: { color: '#214A37', fontSize: 16, fontWeight: '600' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9EFDD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  badgeText: {
    color: '#385131',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: { fontSize: 34, fontWeight: '700', color: '#214A37' },
  description: { fontSize: 18, lineHeight: 27, color: '#5D6B60' },
  note: { fontSize: 14, lineHeight: 22, color: '#687667' },
  label: { fontSize: 17, color: '#214A37', fontWeight: '600' },
  field: { gap: 12 },
  panel: { padding: 20, gap: 14, borderRadius: 18, backgroundColor: '#FFFFFF' },
  input: {
    borderWidth: 1,
    borderColor: '#BEC8B7',
    borderRadius: 12,
    padding: 14,
    color: '#214A37',
    backgroundColor: '#FFFFFF',
    fontSize: 18,
    minHeight: 52,
  },
  addressInput: { minHeight: 94, textAlignVertical: 'top', fontSize: 16 },
  network: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D9DECF',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  selected: { backgroundColor: '#E9EFDD', borderColor: '#214A37' },
  radio: { fontSize: 24, color: '#214A37' },
  estimate: {
    padding: 22,
    borderRadius: 18,
    backgroundColor: '#E9EFDD',
    gap: 12,
  },
  payout: { fontSize: 34, fontWeight: '700', color: '#214A37' },
  detail: { gap: 4 },
  value: { fontSize: 18, color: '#214A37', fontWeight: '600' },
  address: { fontSize: 16, lineHeight: 25, color: '#214A37' },
  primary: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#214A37',
  },
  primaryText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  error: { fontSize: 15, lineHeight: 23, color: '#85472F' },
});
