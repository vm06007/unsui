import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { cancelScan, CardBalance, readCard } from './src/lib/suica';
import RefundQuoteScreen from './src/screens/RefundQuoteScreen';
import DemoReceiptScreen from './src/screens/DemoReceiptScreen';
import DemoLedgerScreen from './src/screens/DemoLedgerScreen';
import { availableDemoBalance, DemoReceipt } from './src/lib/demoLedger';
import { demoLedger } from './src/lib/ledger';
import BrandMark from './src/components/BrandMark';
import AppMenu from './src/components/AppMenu';
import HomeScreen from './src/screens/HomeScreen';
import { cardReceipts } from './src/lib/cardReceipts';
import CardScreen from './src/screens/CardScreen';
import type { PayoutNetwork } from './src/lib/refundQuote';
import { showScanError } from './src/lib/scanFeedback';
import { sampleCard } from './src/lib/sampleCard';
import { getStoredLanguage, storeLanguage } from './src/lib/preferences';
import { DisplayLanguage } from './src/lib/stationTranslations';

export default function App() {
  const [isSample, setIsSample] = useState(false);
  const [language, setLanguage] = useState<DisplayLanguage>('ja');
  const [preferenceError, setPreferenceError] = useState('');
  useEffect(() => {
    let current = true;
    getStoredLanguage()
      .then(value => {
        if (current) setLanguage(value);
      })
      .catch(() => {
        if (current)
          setPreferenceError('Language preference could not be loaded.');
      });
    return () => {
      current = false;
    };
  }, []);
  const changeLanguage = async (value: DisplayLanguage) => {
    setLanguage(value);
    try {
      await storeLanguage(value);
      setPreferenceError('');
    } catch {
      setPreferenceError(
        'Language changed for this session, but could not be saved.',
      );
    }
  };
  const [scanning, setScanning] = useState(false);
  const [card, setCard] = useState<CardBalance | null>(null);
  const [message, setMessage] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [receipts, setReceipts] = useState<DemoReceipt[] | null>(null);
  const [ledgerError, setLedgerError] = useState('');
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<DemoReceipt | null>(
    null,
  );
  const alive = useRef(true);
  const ledgerGeneration = useRef(0);
  const [ledgerBusy, setLedgerBusy] = useState(false);
  const loadLedger = useCallback(async () => {
    const current = ++ledgerGeneration.current;
    setLedgerBusy(true);
    setLedgerError('');
    try {
      const saved = await demoLedger.list();

      if (alive.current && current === ledgerGeneration.current)
        setReceipts(saved);
    } catch (error) {
      if (alive.current && current === ledgerGeneration.current) {
        setReceipts(null);
        setLedgerError(
          error instanceof Error
            ? error.message
            : 'Could not connect. Please try again shortly.',
        );
      }
    } finally {
      if (alive.current && current === ledgerGeneration.current)
        setLedgerBusy(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    loadLedger();
    return () => {
      alive.current = false;
    };
  }, [loadLedger]);
  const available =
    card && receipts
      ? availableDemoBalance(receipts, card.idm, card.balanceJpy)
      : 0;
  const refundDisabled = ledgerBusy || receipts === null || available === 0;
  const [tab, setTab] = useState<'card' | 'history'>('card');
  const [payoutNetwork, setPayoutNetwork] = useState<PayoutNetwork>('sui');
  const generation = useRef(0);
  const busy = useRef(false);
  const cancel = () => {
    generation.current++;
    setScanning(false);
    cancelScan().catch(() => {});
  };
  useEffect(
    () => () => {
      generation.current++;
      cancelScan().catch(() => {});
    },
    [],
  );
  useEffect(() => {
    if (!scanning) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        cancel();
        return true;
      },
    );
    return () => subscription.remove();
  }, [scanning]);
  const scan = async () => {
    if (busy.current) return;
    busy.current = true;
    const current = ++generation.current;
    setIsSample(false);
    setScanning(true);
    setCard(null);
    setRefundOpen(false);
    setTab('card');
    setMessage('');
    const timer = setTimeout(() => {
      if (generation.current !== current) return;
      generation.current++;
      setScanning(false);
      showScanError('No card detected. Hold your card against the phone');
      cancelScan().catch(() => {});
    }, 20000);
    try {
      const result = await readCard(() => generation.current !== current);
      if (generation.current === current) {
        setCard(result);
        await loadLedger();
      }
    } catch (error) {
      if (generation.current === current) {
        setScanning(false);
        showScanError(error);
      }
    } finally {
      clearTimeout(timer);
      busy.current = false;
      setScanning(false);
    }
  };
  const isHome = !card && !ledgerOpen && !selectedReceipt;
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={[styles.screen, isHome && styles.homeScreen]}>
        {!isHome && !selectedReceipt && (
          <View style={styles.brand}>
            <BrandMark />
            {!refundOpen && (
              <AppMenu
                onReceipts={
                  receipts?.length ? () => setLedgerOpen(true) : undefined
                }
                disabled={scanning}
                onHome={() => {
                  setCard(null);
                  setIsSample(false);
                  setLedgerOpen(false);
                  setSelectedReceipt(null);
                  setMessage('');
                  loadLedger();
                }}
                onDemo={() => {
                  setCard(sampleCard());
                  setIsSample(true);
                  setTab('card');
                  setRefundOpen(false);
                  setLedgerOpen(false);
                  setSelectedReceipt(null);
                  setMessage('');
                  loadLedger();
                }}
              />
            )}
          </View>
        )}
        {selectedReceipt ? (
          <DemoReceiptScreen
            receipt={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
          />
        ) : ledgerOpen ? (
          <DemoLedgerScreen
            receipts={receipts ?? []}
            onSelect={setSelectedReceipt}
            onClose={() => setLedgerOpen(false)}
          />
        ) : card && refundOpen ? (
          <RefundQuoteScreen
            onHistory={() => {
              setRefundOpen(false);
              setTab('history');
            }}
            historyCount={
              card.history.length +
              cardReceipts(receipts ?? [], card.idm).length * 2
            }
            initialNetwork={payoutNetwork}
            isSample={isSample}
            balanceJpy={available}
            scannedBalanceJpy={card.balanceJpy}
            cardId={card.idm}
            onRecorded={receipt => {
              setReceipts(current =>
                current?.some(r => r.id === receipt.id)
                  ? current
                  : [...(current ?? []), receipt],
              );
              setRefundOpen(false);
              setSelectedReceipt(receipt);
              loadLedger();
            }}
            onClose={() => {
              setRefundOpen(false);
              loadLedger();
            }}
          />
        ) : !card ? (
          <HomeScreen
            onReset={() => {
              setReceipts([]);
              setSelectedReceipt(null);
              setMessage('');
              loadLedger();
            }}
            scanning={scanning}
            onScan={scan}
            onCancel={cancel}
            onReceipts={
              receipts?.length ? () => setLedgerOpen(true) : undefined
            }
            onDemo={() => {
              setCard(sampleCard());
              setIsSample(true);
              setTab('card');
              setMessage('');
              loadLedger();
            }}
            message={[message, ledgerError].filter(Boolean).join(' ')}
          />
        ) : (
          <CardScreen
            receipts={receipts ?? []}
            key={card.idm}
            card={card}
            available={available}
            isSample={isSample}
            tab={tab}
            onTab={setTab}
            language={language}
            onLanguage={changeLanguage}
            error={[ledgerError, preferenceError, message]
              .filter(Boolean)
              .join(' ')}
            busy={ledgerBusy}
            refundDisabled={refundDisabled}
            scanning={scanning}
            onRefund={network => {
              setPayoutNetwork(network);
              setRefundOpen(true);
            }}
            onScan={scan}
            onCancel={cancel}
            onRefresh={loadLedger}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  homeScreen: { paddingHorizontal: 0 },
  screen: { flex: 1, backgroundColor: '#F5F6F0', paddingHorizontal: 24 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 12,
  },
});
