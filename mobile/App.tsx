import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { cancelScan, CardBalance, readCard } from './src/lib/suica';

export default function App() {
  const [scanning, setScanning] = useState(false);
  const [card, setCard] = useState<CardBalance | null>(null);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'card' | 'history'>('card');
  const scroll = useRef<ScrollView>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const cancel = () => {
    generation.current++;
    setMessage('Scan cancelled. Tap Scan transit card to try again.');
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
    setScanning(true);
    setCard(null);
    setTab('card');
    setMessage('');
    const timer = setTimeout(() => {
      if (generation.current !== current) return;
      generation.current++;
      setMessage(
        'No card detected. Hold your card near the NFC antenna and try again.',
      );
      cancelScan().catch(() => {});
    }, 25000);
    try {
      const result = await readCard(() => generation.current !== current);
      if (generation.current === current) setCard(result);
    } catch (error) {
      if (generation.current === current)
        setMessage(
          error instanceof Error
            ? error.message
            : 'Unable to scan. Hold a physical Suica card still and try again.',
        );
    } finally {
      clearTimeout(timer);
      busy.current = false;
      setScanning(false);
    }
  };
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.screen}>
        <View style={styles.brand}>
          <Text style={styles.name}>UnSui</Text>
          <Text style={styles.japanese}>雲水</Text>
        </View>
        {card && (
          <View style={styles.tabs}>
            {(['card', 'history'] as const).map(value => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === value }}
                onPress={() => {
                  setTab(value);
                  scroll.current?.scrollTo({ y: 0, animated: false });
                }}
                style={[styles.tab, tab === value && styles.activeTab]}
              >
                <Text style={styles.tabText}>
                  {value === 'card'
                    ? 'Card'
                    : `History · ${card.history.length}`}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <ScrollView
          ref={scroll}
          contentContainerStyle={[
            styles.content,
            tab === 'history' && styles.historyContent,
          ]}
        >
          {tab === 'card' && (
            <>
              <Text style={styles.eyebrow}>YOUR TRANSIT CARD, AT A GLANCE</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {scanning
                  ? 'Hold your card close.'
                  : card
                  ? 'A little left to explore.'
                  : 'What’s left on your card?'}
              </Text>
              <Text style={styles.description}>
                {scanning
                  ? 'Place one physical Suica card against your phone’s NFC antenna. Keep it still while we read the balance and recent history.'
                  : 'Tap your physical Suica card to see its balance in yen.'}
              </Text>
              {scanning && (
                <ActivityIndicator
                  size="large"
                  color="#214A37"
                  accessibilityLabel="Waiting for transit card"
                />
              )}
              {card && (
                <View style={styles.balance}>
                  <Text style={styles.description}>Card balance</Text>
                  <Text
                    accessibilityLabel={`${card.balanceJpy} yen`}
                    style={styles.amount}
                  >
                    ¥{card.balanceJpy.toLocaleString('en-US')}
                  </Text>
                  <Text style={styles.note}>
                    Read from your card · no balance changes
                  </Text>
                </View>
              )}
            </>
          )}
          {card && tab === 'history' && (
            <>
              <Text accessibilityRole="header" style={styles.historyTitle}>
                Recent journeys
              </Text>
              <Text style={styles.note}>
                Newest first · up to 20 records stored on your card. Activity
                labels and station names are best-effort.
              </Text>
              {card.historyLimited && (
                <Text style={styles.message}>
                  Only part of the history could be read. Scan again while
                  holding the card still.
                </Text>
              )}
              {card.history.length === 0 && (
                <Text style={styles.description}>
                  No recent history is stored on this card.
                </Text>
              )}
              {card.history.map(record => (
                <View key={record.index} style={styles.historyRow}>
                  <View style={styles.rowHeading}>
                    <Text style={styles.activity}>{record.activity}</Text>
                    <Text style={styles.note}>
                      {record.date || 'Date unavailable'}
                    </Text>
                  </View>
                  <Text style={styles.description}>
                    {record.changeJpy === null
                      ? 'Change unavailable'
                      : `${
                          record.changeJpy > 0
                            ? '+'
                            : record.changeJpy < 0
                            ? '−'
                            : ''
                        }¥${Math.abs(record.changeJpy).toLocaleString(
                          'en-US',
                        )}`}
                    <Text style={styles.note}> · balance change</Text>
                  </Text>
                  <Text style={styles.note}>
                    Balance after · ¥{record.balanceJpy.toLocaleString('en-US')}
                  </Text>
                  {record.activity === 'Rail travel' && (
                    <Text style={styles.note}>
                      {record.entry || 'Unknown entry station'} →{' '}
                      {record.exit || 'Unknown exit station'}
                    </Text>
                  )}
                  {record.activity === 'Other activity' && (
                    <Text style={styles.note}>
                      Terminal 0x{record.terminal.toString(16).padStart(2, '0')}{' '}
                      · process 0x{record.process.toString(16).padStart(2, '0')}
                    </Text>
                  )}
                </View>
              ))}
              <Text style={styles.note}>
                Changes are calculated from adjacent recorded balances. The
                oldest entry has no earlier balance to compare.
              </Text>
            </>
          )}
          {!!message && (
            <Text accessibilityRole="alert" style={styles.message}>
              {message}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={scanning ? cancel : scan}
          >
            <Text style={styles.buttonText}>
              {scanning
                ? 'Cancel scan'
                : card
                ? 'Scan again'
                : 'Scan transit card'}
            </Text>
          </Pressable>
          <Text style={styles.note}>
            NFC balance reader · no account or internet required
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginTop: 20 },
  tab: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  activeTab: { backgroundColor: '#E9EFDD' },
  tabText: { fontSize: 17, color: '#214A37', fontWeight: '600' },
  historyContent: { justifyContent: 'flex-start' },
  historyTitle: { fontSize: 28, color: '#214A37', fontWeight: '700' },
  historyRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  rowHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  activity: { fontSize: 18, fontWeight: '600', color: '#214A37' },
  screen: { flex: 1, backgroundColor: '#F6F7F1', paddingHorizontal: 28 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
  },
  name: { fontSize: 30, fontWeight: '700', color: '#214A37' },
  japanese: { fontSize: 20, color: '#78856B' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 32,
  },
  eyebrow: { fontSize: 12, letterSpacing: 2, color: '#63765C' },
  title: { fontSize: 40, fontWeight: '700', color: '#214A37' },
  description: { fontSize: 18, lineHeight: 28, color: '#5D6B60' },
  note: { fontSize: 14, lineHeight: 22, color: '#687667' },
  balance: {
    backgroundColor: '#E9EFDD',
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  amount: { fontSize: 48, fontWeight: '700', color: '#214A37' },
  button: {
    backgroundColor: '#214A37',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  message: { color: '#85472F', fontSize: 16, lineHeight: 24 },
});
