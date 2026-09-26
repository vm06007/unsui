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
  View,
} from 'react-native';
import {
  RefundQuote,
  applyMarketQuote,
  amountError,
  createDemoQuote,
  PAYOUT_NETWORKS,
  PayoutNetwork,
  recipientError,
} from '../lib/refundQuote';

import { backendRequest } from '../lib/backendLedger';
import { BACKEND_URL } from '../config';
import { verifyRefundHuman } from '../lib/worldId';
import ScanSheet from '../components/ScanSheet';
import { showScanError } from '../lib/scanFeedback';
import { readCard, cancelScan } from '../lib/suica';
import { demoLedger } from '../lib/ledger';
import { DemoReceipt } from '../lib/demoLedger';
import RecipientEditor, {
  Destination,
  manualDestination,
} from '../components/RecipientEditor';
type Props = {
  isSample?: boolean;
  initialNetwork?: PayoutNetwork;
  onHistory?: () => void;
  historyCount?: number;
  balanceJpy: number;
  scannedBalanceJpy: number;
  cardId: string;
  onClose: () => void;
  onChangeNetwork?: () => void;
  onRecorded: (receipt: DemoReceipt) => void;
};
const yen = (value: number) =>
  `¥${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function RefundQuoteScreen({
  isSample = false,
  initialNetwork = 'sui',
  onHistory,
  historyCount = 0,
  balanceJpy,
  scannedBalanceJpy,
  cardId,
  onClose,
  onChangeNetwork,
  onRecorded,
}: Props) {
  const amount = String(balanceJpy);
  const network = initialNetwork;
  const [destination, setDestination] =
    useState<Destination>(manualDestination);
  const [recipientBusy, setRecipientBusy] = useState(false);
  const recipient = destination.address;
  const useMarket = network === 'sui' && !isSample;
  const [marketQuote, setMarketQuote] = useState<RefundQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  useEffect(() => {
    let alive = true;
    setMarketQuote(null);
    setQuoteError('');
    setQuoteLoading(false);
    if (!useMarket || destination.blocked || recipientError(recipient, network))
      return;
    setQuoteLoading(true);
    {
      backendRequest(BACKEND_URL, '/quotes/sui', {
        cardId,
        scannedBalanceJpy,
        amountJpy: balanceJpy,
        recipient,
      })
        .then(result => {
          const base = createDemoQuote(
            String(balanceJpy),
            balanceJpy,
            'sui',
            recipient,
          );
          const quote = applyMarketQuote(base, result.quote);
          if (
            !quote.pricing ||
            quote.recipient !== recipient ||
            quote.amountJpy !== balanceJpy ||
            quote.pricing.cardId !== cardId.toLowerCase() ||
            quote.pricing.expiresAt <= Date.now()
          )
            throw Error('Invalid market quote. Please refresh.');
          if (alive) setMarketQuote(quote);
        })
        .catch(error => {
          if (alive)
            setQuoteError(error.message || 'Could not fetch a current quote.');
        })
        .finally(() => {
          if (alive) setQuoteLoading(false);
        });
    }
    return () => {
      alive = false;
    };
  }, [
    useMarket,
    network,
    recipient,
    destination.blocked,
    cardId,
    balanceJpy,
    scannedBalanceJpy,
    quoteRefresh,
  ]);
  const [attempted, setAttempted] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const [phase, setPhase] = useState<
    'idle' | 'human' | 'confirming' | 'cancelling' | 'saving'
  >('idle');
  const [confirmationError, setConfirmationError] = useState('');
  const humanAbort = useRef<AbortController | null>(null);
  const active = useRef(false);
  const mounted = useRef(true);
  const saving = useRef(false);
  const cancelled = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const cancelConfirmation = (
    reason = 'Confirmation cancelled. No new refund was recorded.',
  ) => {
    if (!active.current || saving.current) return;
    humanAbort.current?.abort();
    cancelled.current = true;
    setConfirmationError(reason);
    setPhase('cancelling');
    cancelScan().catch(() => {});
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      humanAbort.current?.abort();
      cancelled.current = true;
      if (active.current && !saving.current) cancelScan().catch(() => {});
    };
  }, []);
  const confirm = async () => {
    setAttempted(true);
    if (active.current || recipientBusy || amountIssue || recipientIssue)
      return;
    Keyboard.dismiss();
    const quote = useMarket
      ? marketQuote
      : createDemoQuote(amount, balanceJpy, network, recipient);
    if (
      !quote ||
      (useMarket && quote.pricing!.expiresAt <= Date.now() && !request.current)
    ) {
      setQuoteError(
        'Quote expired or unavailable. Refresh and review the new amount.',
      );
      return;
    }
    active.current = true;
    cancelled.current = false;
    saving.current = false;
    setConfirmationError('');
    setPhase(quote.amountJpy > 1000 ? 'human' : 'confirming');
    const fingerprint = JSON.stringify(quote);
    if (request.current?.fingerprint !== fingerprint) {
      request.current = {
        fingerprint,
        id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    }
    const requestId = request.current.id;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const prepared = await demoLedger.prepare({
        requestId,
        quote,
        cardId,
        scannedBalanceJpy,
        confirmedCardId: cardId,
        confirmedBalanceJpy: scannedBalanceJpy,
      });
      humanAbort.current = new AbortController();
      if (cancelled.current || !mounted.current) return;
      const worldVerificationId = await verifyRefundHuman(
        prepared,
        humanAbort.current.signal,
      );
      if (cancelled.current || !mounted.current) return;
      setPhase('confirming');
      timeout = setTimeout(
        () =>
          cancelConfirmation(
            'Confirmation timed out. Hold the same card still and retry.',
          ),
        25000,
      );
      const confirmed = isSample
        ? { idm: cardId, balanceJpy: scannedBalanceJpy }
        : await readCard(() => cancelled.current || !mounted.current, {
            history: false,
          });
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
        requestId: prepared.requestId,
        worldVerificationId,
        quote,
        cardId,
        scannedBalanceJpy,
        confirmedCardId: confirmed.idm,
        confirmedBalanceJpy: confirmed.balanceJpy,
      });
      if (mounted.current) onRecorded(receipt);
    } catch (error) {
      if (mounted.current && !cancelled.current) {
        if (!saving.current && !isSample && quote.amountJpy <= 1000)
          showScanError(error);
        setConfirmationError(
          error instanceof Error
            ? error.message
            : 'Could not record the refund. Please retry.',
        );
      }
    } finally {
      clearTimeout(timeout);
      active.current = false;
      saving.current = false;
      if (mounted.current) setPhase('idle');
    }
  };
  const amountIssue = amountError(amount, balanceJpy);
  const recipientIssue = destination.blocked
    ? 'Wait for the name to resolve, or check the recipient address.'
    : recipientError(recipient, network);
  const back = () => {
    if (active.current) {
      cancelConfirmation();
      return;
    }
    setConfirmationError('');
    Keyboard.dismiss();
    onClose();
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
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose]);
  const payout = PAYOUT_NETWORKS[network];
  const estimate = useMarket
    ? marketQuote
    : !amountIssue
    ? createDemoQuote(
        amount,
        balanceJpy,
        network,
        network === 'sui' ? `0x${'1'.repeat(64)}` : `0x${'1'.repeat(40)}`,
      )
    : null;
  const locked = phase !== 'idle';
  if (phase === 'saving')
    return (
      <View style={styles.issuing} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color="#173E35" />
        <Text accessibilityRole="header" style={styles.title}>
          Issuing refund
        </Text>
        <Text style={styles.issuingNote}>
          Waiting for your {payout.asset} transfer to confirm.
        </Text>
        <Text style={styles.issuingNote}>
          Your receipt will appear as soon as it is ready.
        </Text>
      </View>
    );
  if (phase === 'human')
    return (
      <View style={styles.flex}>
        <Text style={styles.title}>One quick human check</Text>
        <Text style={styles.note}>
          Refunds above ¥1,000 need World ID verification. Complete the check in
          your browser, then return here to scan your card.
        </Text>
        <ActivityIndicator color="#173E35" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel human check"
          onPress={() => cancelConfirmation('Human check cancelled.')}
          style={styles.back}
        >
          <Text style={styles.muted}>Cancel human check</Text>
        </Pressable>
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {onHistory && (
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: true }}
          >
            <Text style={[styles.tabText, styles.tabTextActive]}>
              Your card
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            disabled={
              locked ||
              recipientBusy ||
              (useMarket && (!marketQuote || quoteLoading))
            }
            onPress={onHistory}
            style={styles.tab}
          >
            <Text style={styles.tabText}>History · {historyCount}</Text>
          </Pressable>
        </View>
      )}
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.balanceCard}>
          <View style={styles.row}>
            <Text style={styles.overline}>AVAILABLE TO REFUND</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change payout network"
              disabled={locked}
              onPress={() => {
                if (active.current) return;
                Keyboard.dismiss();
                (onChangeNetwork ?? onClose)();
              }}
            >
              <Text style={styles.network}>{payout.name} ⌄</Text>
            </Pressable>
          </View>
          <Text style={styles.balance}>
            ¥{balanceJpy.toLocaleString('en-US')}
          </Text>
          <Text style={styles.rate}>
            {useMarket
              ? marketQuote
                ? `${marketQuote.estimatedCrypto} SUI after fee`
                : 'Market quote on confirmation'
              : `≈ ${(balanceJpy / payout.yenPerAsset).toFixed(6)} ${
                  payout.asset
                }`}
          </Text>
          <Text style={styles.physical}>
            On your card · {yen(scannedBalanceJpy)}
          </Text>
        </View>
        <RecipientEditor
          key={network}
          network={network}
          value={destination}
          onChange={setDestination}
          onBusy={setRecipientBusy}
          disabled={locked}
        />
        {attempted && recipientIssue && (
          <Text accessibilityRole="alert" style={styles.error}>
            {recipientIssue}
          </Text>
        )}
        {attempted && amountIssue && (
          <Text accessibilityRole="alert" style={styles.error}>
            {amountIssue}
          </Text>
        )}
        {isSample && (
          <Text style={styles.note}>
            Sample card selected. Confirmation uses the sample card without NFC.
          </Text>
        )}
        {useMarket && (
          <View>
            {quoteLoading && <ActivityIndicator color="#173E35" />}
            {!!quoteError && <Text style={styles.error}>{quoteError}</Text>}
            {marketQuote?.pricing && (
              <Text style={styles.note}>
                CoinGecko · ¥
                {Number(marketQuote.pricing.jpyPerSuiMicros) / 1000000} / SUI ·
                quote valid for 5 minutes
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh quote"
              disabled={locked || quoteLoading}
              onPress={() => {
                request.current = null;
                setQuoteRefresh(v => v + 1);
              }}
            >
              <Text style={styles.link}>Refresh quote</Text>
            </Pressable>
          </View>
        )}
        {estimate && (
          <Text testID="quote-payout" style={styles.note}>
            Receive {useMarket ? '' : '≈ '}
            {estimate.estimatedCrypto} {payout.asset} · fee{' '}
            {yen(estimate.feeJpy)} (2%)
          </Text>
        )}
        {!!confirmationError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {confirmationError}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Confirm refund"
          disabled={
            locked ||
            recipientBusy ||
            (useMarket && (!marketQuote || quoteLoading))
          }
          onPress={confirm}
          style={[styles.button, (locked || recipientBusy) && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {phase === 'cancelling'
              ? 'Closing scanner…'
              : isSample
              ? 'Confirm sample refund'
              : 'Scan card to confirm'}
          </Text>
        </Pressable>
        {locked && <ActivityIndicator color="#173E35" />}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to card"
          disabled={locked}
          onPress={back}
          style={styles.back}
        >
          <Text style={styles.muted}>Back to card</Text>
        </Pressable>
      </ScrollView>
      <ScanSheet
        title="Confirm your refund"
        subtitle="Scan the same card again to continue"
        visible={phase === 'confirming' && !isSample}
        onCancel={() => cancelConfirmation()}
      />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  issuing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 18,
    backgroundColor: '#F5F6F0',
  },
  issuingNote: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 23,
    color: '#68776F',
  },
  deviceWallet: { marginTop: 12 },
  walletButton: {
    padding: 14,
    backgroundColor: '#E5EBDD',
    borderRadius: 14,
    alignItems: 'center',
  },
  walletButtonText: { color: '#173E35', fontWeight: '700', fontSize: 13 },
  walletNote: { fontSize: 10, lineHeight: 16, color: '#68776F', marginTop: 8 },
  root: { flex: 1, backgroundColor: '#F5F6F0' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 23,
    color: '#173E35',
    fontWeight: '800',
    letterSpacing: -1,
  },
  badge: { fontSize: 10, letterSpacing: 1.4, color: '#64766A' },
  tabs: {
    marginHorizontal: 0,
    flexDirection: 'row',
    backgroundColor: '#E5EBDD',
    padding: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, color: '#68776F' },
  tabTextActive: { color: '#173E35', fontWeight: '700' },
  content: { paddingTop: 12, paddingBottom: 32 },
  balanceCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#173E35',
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  overline: { fontSize: 10, letterSpacing: 1.4, color: '#B5CDBB' },
  network: {
    color: '#CBEE9F',
    fontSize: 13,
    paddingVertical: 8,
    paddingLeft: 12,
  },
  balance: {
    fontSize: 43,
    fontWeight: '600',
    color: '#F5F6F0',
    letterSpacing: -2,
  },
  rate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CBEE9F',
    marginTop: 4,
    marginBottom: 16,
  },
  physical: {
    fontSize: 11,
    color: '#B5CDBB',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#416354',
  },
  button: {
    backgroundColor: '#173E35',
    borderRadius: 17,
    padding: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  historyShortcut: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  link: { color: '#24856B', fontSize: 13 },
  disclosure: { fontSize: 10, lineHeight: 16, color: '#68776F', marginTop: 12 },
  back: { alignItems: 'center', padding: 16 },
  muted: { color: '#68776F', fontSize: 13 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#173E35',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DCE3D7',
    borderRadius: 14,
    padding: 14,
    color: '#173E35',
    fontSize: 14,
  },
  fill: { paddingVertical: 14 },
  note: { fontSize: 12, lineHeight: 19, color: '#68776F', marginBottom: 10 },
  error: { color: '#B74136', fontSize: 13, marginTop: 12 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#173E35',
    letterSpacing: -0.7,
  },
  languages: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: '#E5EBDD',
    borderRadius: 12,
  },
  language: { padding: 9, borderRadius: 10 },
  small: { fontSize: 13, color: '#173E35' },
  activity: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginTop: 10,
    padding: 14,
  },
  refundActivity: { backgroundColor: '#E6EEDD' },
  activityTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityBody: { flex: 1 },
  refundAmount: { color: '#24856B' },
  itemTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: '#173E35',
  },
  date: { fontSize: 14, lineHeight: 20, color: '#52665A', marginTop: 6 },
  right: { alignItems: 'flex-end', maxWidth: '32%' },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#DCE3D7',
    marginTop: 14,
    paddingTop: 12,
  },
  empty: { paddingVertical: 36, alignItems: 'center' },
});
