import BrandMark from './BrandMark';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onHome: () => void;
  onDemo: () => void;
  disabled?: boolean;
  onReceipts?: () => void;
};
export default function AppMenu({
  onHome,
  onDemo,
  disabled,
  onReceipts,
}: Props) {
  const [page, setPage] = useState<'closed' | 'menu' | 'about'>('closed');
  const insets = useSafeAreaInsets();
  const close = () => setPage('closed');
  const select = (action: () => void) => {
    close();
    action();
  };
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        accessibilityState={{
          expanded: page !== 'closed',
          disabled: !!disabled,
        }}
        disabled={disabled}
        onPress={() => setPage('menu')}
        style={styles.trigger}
      >
        {[0, 1, 2].map(line => (
          <View key={line} style={styles.bar} />
        ))}
      </TouchableOpacity>
      <Modal
        visible={page !== 'closed'}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View
          style={[
            styles.overlay,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 },
          ]}
        >
          <Pressable
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            onPress={close}
            style={styles.scrim}
          />
          <View accessibilityViewIsModal style={styles.panel}>
            <View style={styles.heading}>
              <BrandMark />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                onPress={close}
                style={styles.close}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {page === 'menu' ? (
                <>
                  {onReceipts && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Open receipts"
                      style={styles.item}
                      onPress={() => select(onReceipts)}
                    >
                      <Text style={styles.itemText}>Receipts</Text>
                      <Text style={styles.arrow}>↗</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.item}
                    onPress={() => select(onHome)}
                  >
                    <Text style={styles.itemText}>Home</Text>
                    <Text style={styles.arrow}>↗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.item}
                    onPress={() => setPage('about')}
                  >
                    <Text style={styles.itemText}>About</Text>
                    <Text style={styles.arrow}>↗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.item}
                    accessibilityLabel="Try sample card"
                    onPress={() => select(onDemo)}
                  >
                    <Text style={styles.itemText}>Try a sample card</Text>
                    <Text style={styles.arrow}>↗</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.about}>
                  <Text style={styles.brand}>About UnSui (雲水)</Text>
                  <Text style={styles.tagline}>
                    Your journey, with more to go.
                  </Text>
                  <Text style={styles.body}>
                    Read your Suica balance and history, choose Sui, Ethereum or
                    Mizuhiki, and scan again to confirm your refund request.
                  </Text>
                  <Text style={styles.body}>
                    Keep track of your refund requests and receipts in one
                    place. Try a sample card to explore the app without NFC.
                  </Text>
                  <Text style={styles.event}>ETHGlobal Tokyo 2026</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => setPage('menu')}
                    style={styles.back}
                  >
                    <Text style={styles.backText}>Back to menu</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E5EBDD',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bar: { width: 18, height: 2, backgroundColor: '#173E35', borderRadius: 2 },
  overlay: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 24 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14,35,28,0.28)',
  },
  panel: {
    backgroundColor: '#F5F6F0',
    borderRadius: 22,
    width: '100%',
    maxWidth: 360,
    maxHeight: '100%',
    padding: 20,
    elevation: 12,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brand: {
    fontSize: 23,
    fontWeight: '700',
    color: '#173E35',
    letterSpacing: -0.8,
  },
  close: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { fontSize: 27, color: '#52665A' },
  item: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#DDE5D6',
  },
  itemText: { fontSize: 18, fontWeight: '600', color: '#173E35' },
  arrow: { fontSize: 18, color: '#24856B' },
  about: { paddingTop: 4 },
  tagline: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '600',
    color: '#173E35',
    marginBottom: 16,
  },
  body: { fontSize: 14, lineHeight: 22, color: '#52665A', marginBottom: 16 },
  event: { fontSize: 12, color: '#24856B', marginBottom: 12 },
  back: { paddingVertical: 14 },
  backText: { fontSize: 14, fontWeight: '600', color: '#173E35' },
});
