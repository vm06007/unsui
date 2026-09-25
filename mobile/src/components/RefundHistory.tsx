import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { DemoReceipt } from '../lib/demoLedger';
import { PAYOUT_NETWORKS } from '../lib/refundQuote';
import HistoryIcon from './HistoryIcon';
import { styles } from '../screens/CardScreen.styles';

export default function RefundHistory({
  receipts,
}: {
  receipts: DemoReceipt[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <>
      {receipts.flatMap(receipt =>
        (['refund', 'service'] as const).map(kind => {
          const key = `${receipt.id}:${kind}`;
          const refund = kind === 'refund';
          const payout = PAYOUT_NETWORKS[receipt.network];
          return (
            <View
              key={key}
              style={[styles.activity, refund && styles.refundActivity]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${
                  refund ? payout.asset + ' refund' : 'UnSui service'
                } ${receipt.id}`}
                accessibilityState={{ expanded: expanded === key }}
                style={styles.activityTop}
                onPress={() => setExpanded(expanded === key ? null : key)}
              >
                <HistoryIcon
                  consoleType={refund ? -1 : -2}
                  synthetic
                  hasStation={false}
                />
                <View style={styles.activityBody}>
                  <Text style={styles.itemTitle}>
                    {refund ? `${payout.asset} refund` : 'UnSui service'}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(receipt.createdAt).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text
                    style={[styles.itemTitle, refund && styles.refundAmount]}
                  >
                    {refund
                      ? Number(receipt.estimatedCrypto).toFixed(
                          receipt.network === 'ethereum' ? 6 : 4,
                        )
                      : `−¥${receipt.amountJpy.toLocaleString('en-US')}`}
                  </Text>
                  <Text style={styles.date}>
                    {refund ? payout.asset : 'JPY'}{' '}
                    {expanded === key ? '−' : '+'}
                  </Text>
                </View>
              </TouchableOpacity>
              {expanded === key && (
                <View style={styles.details}>
                  <Text style={styles.note}>
                    Available after · ¥
                    {receipt.remainingDemoJpy.toLocaleString('en-US')}
                  </Text>
                  <Text style={styles.note}>Receipt · {receipt.id}</Text>
                  {refund && (
                    <>
                      <Text selectable style={styles.note}>
                        {receipt.recipient}
                      </Text>
                      <Text style={styles.note}>
                        {payout.name} · fee ¥
                        {receipt.feeJpy.toLocaleString('en-US')}
                      </Text>
                    </>
                  )}
                  <Text style={styles.note}>
                    Recorded in your refund history.
                  </Text>
                </View>
              )}
            </View>
          );
        }),
      )}
    </>
  );
}
