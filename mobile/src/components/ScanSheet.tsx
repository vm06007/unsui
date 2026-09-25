import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
export default function ScanSheet({
  visible,
  onCancel,
}: {
  visible: boolean;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={s.overlay}>
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.handle} />
          <ActivityIndicator size="large" color="#173E35" />
          <Text style={s.title}>Hold your card close.</Text>
          <Text style={s.note}>
            Place one physical Suica card against your phone’s NFC antenna. Keep
            it still while we read its balance and journeys.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel scan"
            onPress={onCancel}
            style={s.button}
          >
            <Text style={s.label}>Cancel scan</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14,35,28,.35)',
  },
  sheet: {
    backgroundColor: '#F5F6F0',
    padding: 28,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 22,
    alignItems: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD3C4' },
  title: { fontSize: 27, fontWeight: '700', color: '#173E35' },
  note: { fontSize: 17, lineHeight: 25, color: '#68776F', textAlign: 'center' },
  button: {
    padding: 17,
    borderRadius: 14,
    backgroundColor: '#E5EBDD',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  label: { fontSize: 17, color: '#173E35', fontWeight: '600' },
});
