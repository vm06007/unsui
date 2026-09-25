import React from 'react';
import MonkIcon from './MonkIcon';
import { StyleSheet, Text, View } from 'react-native';

/** Shared wordmark: matches the website; the Android app name remains UnSui. */
export default function BrandMark() {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel="UnSui, clouds and water"
    >
      <View style={styles.icon}>
        <MonkIcon />
      </View>
      <Text style={styles.name}>
        un<Text style={styles.sui}>sui</Text>
      </Text>
      <Text style={styles.japanese}>(雲水)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  icon: { width: 38, height: 38, borderRadius: 11, marginRight: 9 },
  name: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: '#152A23',
  },
  sui: { fontWeight: '400' },
  japanese: { fontSize: 20, marginLeft: 7, marginTop: 3, color: '#657B59' },
});
