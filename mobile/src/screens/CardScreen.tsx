import React, { useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { CardBalance } from '../lib/suica';
import {
  DisplayLanguage,
  translateStationName,
  translateRoute,
} from '../lib/stationTranslations';
import { PAYOUT_NETWORKS, PayoutNetwork } from '../lib/refundQuote';
import HistoryIcon from '../components/HistoryIcon';
import ScanSheet from '../components/ScanSheet';
import RefundHistory from '../components/RefundHistory';
import { cardReceipts } from '../lib/cardReceipts';
import type { DemoReceipt } from '../lib/demoLedger';
import { styles } from './CardScreen.styles';
type Props = {
  card: CardBalance;
  receipts: DemoReceipt[];
  available: number;
  isSample: boolean;
  tab: 'card' | 'history';
  onTab: (tab: 'card' | 'history') => void;
  language: DisplayLanguage;
  onLanguage: (lang: DisplayLanguage) => void;
  error: string;
  busy: boolean;
  refundDisabled: boolean;
  scanning: boolean;
  onRefund: (network: PayoutNetwork) => void;
  onScan: () => void;
  onCancel: () => void;
  onRefresh: () => void;
};
export default function CardScreen({
  card,
  receipts,
  available,
  tab,
  onTab,
  language,
  onLanguage,
  error,
  busy,
  refundDisabled,
  scanning,
  onRefund,
  onScan,
  onCancel,
  onRefresh,
}: Props) {
  const scroll = useRef<ScrollView>(null);
  const [network, setNetwork] = useState<PayoutNetwork>('sui');
  const [networkOpen, setNetworkOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const refunds = cardReceipts(receipts, card.idm);
  const historyCount = card.history.length + refunds.length * 2;
  const payout = PAYOUT_NETWORKS[network];
  const switchTab = (next: 'card' | 'history') => {
    onTab(next);
    setExpanded(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {(['card', 'history'] as const).map(value => (
          <TouchableOpacity
            key={value}
            accessibilityRole="tab"
            accessibilityLabel={value === 'card' ? 'Your card' : 'Card history'}
            accessibilityState={{ selected: tab === value }}
            style={[styles.tab, tab === value && styles.tabActive]}
            onPress={() => switchTab(value)}
          >
            <Text
              style={[styles.tabText, tab === value && styles.tabTextActive]}
            >
              {value === 'card' ? 'Your card' : `History · ${historyCount}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        {tab === 'card' ? (
          <>
            <View style={styles.balanceCard}>
              <View style={styles.row}>
                <Text style={styles.overline}>AVAILABLE TO REFUND</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Change payout network"
                  onPress={() => setNetworkOpen(!networkOpen)}
                >
                  <Text style={styles.network}>{payout.name} ⌄</Text>
                </TouchableOpacity>
              </View>
              <Text
                accessibilityLabel={`Available for refunds: ¥${available.toLocaleString(
                  'en-US',
                )}`}
                style={styles.balance}
              >
                ¥{available.toLocaleString('en-US')}
              </Text>
              <Text style={styles.rate}>
                ≈{' '}
                {(available / payout.yenPerAsset).toFixed(
                  network === 'sui' ? 4 : 6,
                )}{' '}
                {payout.asset}
              </Text>
              <Text
                accessibilityLabel={`${card.balanceJpy} yen`}
                style={styles.physical}
              >
                On your card · ¥{card.balanceJpy.toLocaleString('en-US')}
              </Text>
            </View>
            {networkOpen && (
              <View style={styles.networkPanel}>
                <Text style={styles.label}>Receive on</Text>
                {(Object.keys(PAYOUT_NETWORKS) as PayoutNetwork[]).map(
                  value => (
                    <TouchableOpacity
                      key={value}
                      style={styles.networkOption}
                      onPress={() => {
                        setNetwork(value);
                        setNetworkOpen(false);
                      }}
                    >
                      <Text style={styles.itemTitle}>
                        {PAYOUT_NETWORKS[value].name}
                        {value === 'sui' ? ' · Default' : ''}
                      </Text>
                      <Text style={styles.link}>
                        {network === value ? '✓' : '→'}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Preview refund"
              disabled={refundDisabled}
              style={[styles.button, refundDisabled && styles.disabled]}
              onPress={() => onRefund(network)}
            >
              <Text style={styles.buttonText}>
                {available > 0 ? 'Request refund   →' : 'No balance available'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.historyShortcut}
              onPress={() => switchTab('history')}
            >
              <Text style={styles.link}>View card history</Text>
              <Text style={styles.link}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onScan}
              style={styles.back}
            >
              <Text style={styles.muted}>Scan again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <View>
                <Text style={styles.title}>Your journey</Text>
                <Text style={styles.note}>Card activity & refunds</Text>
              </View>
              <View style={styles.languages}>
                {(['en', 'ja'] as const).map(lang => (
                  <TouchableOpacity
                    key={lang}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      lang === 'en'
                        ? 'English station names'
                        : 'Japanese station names'
                    }
                    accessibilityState={{ selected: language === lang }}
                    style={[
                      styles.language,
                      language === lang && styles.tabActive,
                    ]}
                    onPress={() => onLanguage(lang)}
                  >
                    <Text style={styles.small}>
                      {lang === 'en' ? 'EN' : '日本語'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {card.historyLimited && (
              <Text style={styles.error}>
                Only part of the history could be read. Scan again while holding
                the card still.
              </Text>
            )}
            {historyCount === 0 && (
              <View style={styles.empty}>
                <Text style={styles.itemTitle}>No activity yet</Text>
                <Text style={styles.note}>
                  Your card has no saved journeys to show.
                </Text>
              </View>
            )}
            <RefundHistory receipts={refunds} />
            {card.history.map(item => {
              const entry = translateStationName(
                item.entry?.split(' · ')[0] ?? null,
                language,
              );
              const exit = translateStationName(
                item.exit?.split(' · ')[0] ?? null,
                language,
              );
              const delta = item.changeJpy;
              return (
                <View key={item.index} style={styles.activity}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ expanded: expanded === item.index }}
                    style={styles.activityTop}
                    onPress={() =>
                      setExpanded(expanded === item.index ? null : item.index)
                    }
                  >
                    <HistoryIcon
                      consoleType={item.terminal}
                      hasStation={!!entry}
                    />
                    <View style={styles.activityBody}>
                      <Text style={styles.itemTitle}>
                        {entry
                          ? `${entry}${exit ? ` → ${exit}` : ''}`
                          : item.activity}
                      </Text>
                      <Text style={styles.date}>
                        {item.date?.replace(/-/g, '.') ?? 'Date unavailable'}
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <Text style={styles.itemTitle}>
                        {delta === null
                          ? `¥${item.balanceJpy.toLocaleString('en-US')}`
                          : `${
                              delta > 0 ? '+' : delta < 0 ? '−' : ''
                            }¥${Math.abs(delta).toLocaleString('en-US')}`}
                      </Text>
                      <Text style={styles.date}>
                        {delta === null ? 'balance' : 'JPY'}{' '}
                        {expanded === item.index ? '−' : '+'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {expanded === item.index && (
                    <View style={styles.details}>
                      {item.entry && (
                        <Text style={styles.note}>
                          {translateRoute(item.entry, language)}
                          {item.exit
                            ? ` → ${translateRoute(item.exit, language)}`
                            : ''}
                        </Text>
                      )}
                      <Text style={styles.note}>
                        Card balance after · ¥
                        {item.balanceJpy.toLocaleString('en-US')}
                      </Text>
                      {item.activity.startsWith('Unknown') && (
                        <Text style={styles.note}>
                          Terminal 0x{item.terminal.toString(16)} · process 0x
                          {item.process.toString(16)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh ledger"
          disabled={busy}
          style={styles.back}
          onPress={onRefresh}
        >
          <Text style={styles.muted}>{busy ? 'Refreshing…' : 'Refresh'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <ScanSheet visible={scanning} onCancel={onCancel} />
    </View>
  );
}
