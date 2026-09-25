import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  DEFAULT_LEDGER,
  LedgerSettings as Settings,
  loadLedgerSettings,
  normalizeBackendUrl,
  saveLedgerSettings,
} from '../lib/preferences';
import { checkBackend } from '../lib/backendLedger';
export default function LedgerSettings({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<Settings>(DEFAULT_LEDGER);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    loadLedgerSettings()
      .then(s => {
        if (alive) setValue(s);
      })
      .catch(() => {
        if (alive)
          setError(
            'Could not read settings. Choose a ledger and save to repair them.',
          );
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  const save = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setError('');
    try {
      const next = { ...value, url: normalizeBackendUrl(value.url) };
      await checkBackend(next.url);
      await saveLedgerSettings(next);
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not connect. Check the URL and USB forwarding.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={s.overlay}>
        <View style={s.panel} accessibilityViewIsModal>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.title}>Ledger connection</Text>
            <Text style={s.note}>
              Refunds and balances are saved in the shared development backend.
              The phone stores no receipt ledger.
            </Text>
            <Text style={s.label}>Backend URL</Text>
            <TextInput
              accessibilityLabel="Backend URL"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              style={s.input}
              value={value.url}
              onChangeText={url => setValue({ ...value, url })}
            />
            <Text style={s.note}>
              Android USB: adb reverse tcp:4100 tcp:4100. On iPhone use the
              development computer’s LAN address. Keep this demo service on a
              trusted development network.
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            {busy && <ActivityIndicator color="#173E35" />}
            <Pressable
              accessibilityRole="button"
              disabled={busy || !ready}
              onPress={save}
              style={s.button}
            >
              <Text style={s.buttonText}>
                {busy ? 'Connecting…' : 'Save connection'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onClose}
              style={s.option}
            >
              <Text style={s.label}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14,35,28,.35)',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    backgroundColor: '#F5F6F0',
    padding: 24,
    borderRadius: 24,
    maxHeight: '90%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#173E35',
    marginBottom: 12,
  },
  note: { fontSize: 15, lineHeight: 22, color: '#68776F', marginBottom: 16 },
  label: { fontSize: 16, color: '#173E35' },
  option: { padding: 16, borderRadius: 14, marginVertical: 6 },
  selected: { backgroundColor: '#E5EBDD' },
  input: {
    borderWidth: 1,
    borderColor: '#ADB8A6',
    padding: 14,
    borderRadius: 12,
    color: '#173E35',
    fontSize: 16,
    marginVertical: 12,
  },
  button: {
    backgroundColor: '#173E35',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { fontSize: 17, color: '#FFF', fontWeight: '600' },
  error: { color: '#85472F', fontSize: 15, marginVertical: 12 },
});
