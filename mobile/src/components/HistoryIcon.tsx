import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { consoleType: number; synthetic?: boolean; hasStation: boolean };
export default function HistoryIcon({
  consoleType,
  synthetic,
  hasStation,
}: Props) {
  const bus = consoleType === 0x05 || consoleType === 0x46;
  const machine =
    consoleType === 0x07 || consoleType === 0x12 || consoleType === 0xc7;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, consoleType === -1 && styles.refund]}
    >
      {bus ? (
        <View style={styles.bus}>
          <View style={styles.busWindow}>
            <View style={styles.windowDivider} />
          </View>
          <View style={styles.lights}>
            <View style={styles.light} />
            <View style={styles.light} />
          </View>
          <View style={[styles.wheel, styles.leftWheel]} />
          <View style={[styles.wheel, styles.rightWheel]} />
        </View>
      ) : machine ? (
        <View style={styles.machine}>
          <View style={styles.products}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={styles.product} />
            ))}
          </View>
          <View style={styles.payment} />
          <View style={styles.tray} />
        </View>
      ) : (
        <Text style={styles.symbol}>
          {consoleType === -1 ? '↗' : synthetic ? '−' : hasStation ? '→' : '•'}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0F2EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refund: { backgroundColor: '#CBEE9F' },
  symbol: { fontSize: 22, color: '#173E35' },
  bus: {
    width: 23,
    height: 24,
    borderWidth: 1.8,
    borderColor: '#173E35',
    borderRadius: 5,
    padding: 3,
  },
  busWindow: {
    height: 9,
    borderWidth: 1.3,
    borderColor: '#173E35',
    borderRadius: 2,
    alignItems: 'center',
  },
  windowDivider: { height: '100%', width: 1.3, backgroundColor: '#173E35' },
  lights: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  light: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#173E35' },
  wheel: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    backgroundColor: '#173E35',
    borderRadius: 1,
  },
  leftWheel: { left: 2 },
  rightWheel: { right: 2 },
  machine: {
    width: 23,
    height: 27,
    borderWidth: 1.8,
    borderColor: '#173E35',
    borderRadius: 3,
  },
  products: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  product: { width: 4, height: 5, borderRadius: 1, backgroundColor: '#527C65' },
  payment: {
    position: 'absolute',
    top: 5,
    right: 2,
    width: 3,
    height: 7,
    backgroundColor: '#173E35',
    borderRadius: 1,
  },
  tray: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    right: 3,
    height: 3,
    backgroundColor: '#173E35',
    borderRadius: 1,
  },
});
