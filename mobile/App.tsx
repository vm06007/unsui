import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.screen}>
        <View style={styles.brand}>
          <Text style={styles.name}>UnSui</Text>
          <Text style={styles.japanese}>雲水</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>FROM TRANSIT CARD TO CRYPTO WALLET</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Straight to your wallet.
          </Text>
          <Text style={styles.description}>
            A new journey for your leftover transit-card balance.
          </Text>
          <Text style={styles.note}>
            Mobile prototype · NFC scanning coming next
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7F1', padding: 28 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
  },
  name: { fontSize: 30, fontWeight: '700', color: '#214A37' },
  japanese: { fontSize: 20, color: '#78856B' },
  content: { flex: 1, justifyContent: 'center', gap: 20 },
  eyebrow: { fontSize: 12, letterSpacing: 2, color: '#63765C' },
  title: { fontSize: 44, fontWeight: '700', color: '#214A37' },
  description: { fontSize: 18, lineHeight: 28, color: '#5D6B60' },
  note: { fontSize: 14, lineHeight: 22, color: '#687667', marginTop: 20 },
});
