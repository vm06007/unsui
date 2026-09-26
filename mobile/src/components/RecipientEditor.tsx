import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PAYOUT_NETWORKS, PayoutNetwork } from '../lib/refundQuote';
import {
  cancelDeviceWallet,
  connectDeviceWallet,
  isDeviceWalletAvailable,
  isEvmNetwork,
  signDeviceWallet,
  switchDeviceWallet,
  WALLET_CHAINS,
  WalletConnection,
  WalletSignature,
} from '../lib/deviceWallet';
import {
  randomDemoName,
  ResolvedSuiName,
  resolveSuiName,
} from '../lib/suiNames';
export type Destination = {
  input: string;
  address: string;
  blocked: boolean;
  connection?: WalletConnection;
  signed?: WalletSignature;
  resolved?: ResolvedSuiName;
};
export const manualDestination = (value = ''): Destination => ({
  input: value,
  address: value,
  blocked: false,
});
type Props = {
  disabled?: boolean;
  network: PayoutNetwork;
  value: Destination;
  onChange: (value: Destination) => void;
  onBusy: (busy: boolean) => void;
};
export default function RecipientEditor({
  disabled = false,
  network,
  value,
  onChange,
  onBusy,
}: Props) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const epoch = useRef(0);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const running = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const evm = isEvmNetwork(network);
  const mismatch =
    evm &&
    value.connection &&
    value.connection.chainId !== WALLET_CHAINS[network];
  const invalidate = useCallback(() => {
    clearTimeout(lookupTimer.current);
    epoch.current++;
    abort.current?.abort();
    if (running.current) cancelDeviceWallet().catch(() => {});
  }, []);
  useEffect(() => {
    let alive = true;
    isDeviceWalletAvailable().then(result => {
      if (alive) setAvailable(result);
    });
    return () => {
      alive = false;
      invalidate();
    };
  }, [invalidate]);
  const cancel = () => {
    clearTimeout(lookupTimer.current);
    epoch.current++;
    abort.current?.abort();
    cancelDeviceWallet().catch(() => {});
    running.current = false;
    setBusy(false);
    onBusy(false);
    setError('Request cancelled. You can retry or use manual entry.');
  };
  const run = async (
    action: 'connect' | 'switch' | 'sign' | 'resolve',
    name = value.input,
  ) => {
    if (running.current || disabled) return;
    running.current = true;
    const current = ++epoch.current;
    setBusy(true);
    onBusy(true);
    setError('');
    if (action === 'resolve')
      onChange({ input: name, address: '', blocked: true });
    else onChange({ ...value, signed: undefined, blocked: true });
    try {
      if (action === 'resolve') {
        abort.current = new AbortController();
        const result = await resolveSuiName(name, abort.current.signal);
        if (current === epoch.current)
          onChange({
            input: result.name,
            address: result.address,
            blocked: false,
            resolved: result,
          });
      } else if (isEvmNetwork(network)) {
        if (action === 'sign') {
          const signed = await signDeviceWallet(network, value.address);
          if (current === epoch.current)
            onChange({ ...value, signed, blocked: false });
        } else {
          const connection =
            action === 'switch'
              ? await switchDeviceWallet(network)
              : await connectDeviceWallet();
          if (current === epoch.current)
            onChange({
              input: connection.address,
              address: connection.address,
              blocked: connection.chainId !== WALLET_CHAINS[network],
              connection,
            });
        }
      }
    } catch (failure) {
      if (current === epoch.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Request failed. Please retry.',
        );
        if (action === 'sign' || action === 'switch')
          onChange({ ...value, signed: undefined, blocked: true });
      }
    } finally {
      if (current === epoch.current) {
        running.current = false;
        setBusy(false);
        onBusy(false);
      }
    }
  };
  const edit = (text: string) => {
    clearTimeout(lookupTimer.current);
    setError('');
    if (network === 'sui' && text.trim().toLowerCase().endsWith('.sui')) {
      lookupTimer.current = setTimeout(() => {
        run('resolve', text);
      }, 500);
    }
    onChange(
      network === 'sui' && !text.trim().startsWith('0x')
        ? { input: text, address: '', blocked: true }
        : manualDestination(text),
    );
  };
  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {network === 'sui'
          ? 'Send to'
          : `${PAYOUT_NETWORKS[network].name} wallet address`}
      </Text>
      <TextInput
        testID="refund-recipient"
        accessibilityLabel="Recipient wallet address"
        value={value.input}
        onChangeText={edit}
        editable={!busy && !disabled}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        placeholder={network === 'sui' ? '0x… or yourname.sui' : '0x…'}
        placeholderTextColor="#78856B"
        style={styles.input}
      />
      {network === 'sui' ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use developer address"
            disabled={busy || disabled}
            onPress={() => {
              clearTimeout(lookupTimer.current);
              run('resolve', randomDemoName());
            }}
            style={styles.prefill}
          >
            <Text style={styles.prefillText}>Use developer address</Text>
          </Pressable>
          {value.resolved && (
            <Text
              selectable
              style={styles.note}
              accessibilityLabel="Resolved recipient address"
            >
              {value.resolved.address}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.note}>
            {available
              ? 'Connect the dGen1 system wallet, or enter an address manually.'
              : 'dGen1 is unavailable on this device. Manual address entry is available.'}
          </Text>
          <Action
            label={
              value.connection
                ? 'Reconnect dGen1 wallet'
                : 'Connect dGen1 wallet'
            }
            disabled={disabled || busy || !available}
            onPress={() => run('connect')}
          />
          {value.connection && (
            <View style={styles.panel}>
              <Text style={styles.label}>
                dGen1 wallet · chain {value.connection.chainId}
              </Text>
              {mismatch && (
                <Text accessibilityRole="alert" style={styles.error}>
                  Wallet network mismatch. Switch to{' '}
                  {network === 'ethereum'
                    ? 'Ethereum (1)'
                    : 'Mizuhiki Awaji (6497)'}{' '}
                  or use manual entry.
                </Text>
              )}
              {(mismatch || value.blocked) && (
                <Action
                  label="Switch dGen1 network"
                  disabled={busy || disabled}
                  onPress={() => run('switch')}
                />
              )}
              {!mismatch && !value.blocked && (
                <Action
                  label="Sign destination message (optional)"
                  disabled={busy || disabled}
                  onPress={() => run('sign')}
                />
              )}
              {value.signed && (
                <>
                  <Text style={styles.label}>Message signed on dGen1</Text>
                  <Text selectable style={styles.note}>
                    {value.signed.message}
                  </Text>
                  <Action
                    label="Remove signature"
                    disabled={busy || disabled}
                    onPress={() => onChange({ ...value, signed: undefined })}
                  />
                </>
              )}
              <Text style={styles.note}>
                Signing requests personal_sign only, never a transaction or
                token approval. The response is held for this session; it is not
                server-verified proof of ownership or payment.
              </Text>
              <Action
                label="Use manual entry"
                disabled={busy || disabled}
                onPress={() => {
                  onChange(manualDestination());
                  setError('');
                }}
              />
            </View>
          )}
        </>
      )}
      {busy && (
        <View style={styles.group}>
          <ActivityIndicator color="#214A37" />
          <Text style={styles.note}>
            {evm ? 'Check your dGen1 wallet…' : 'Resolving SuiNS name…'}
          </Text>
          <Action label="Cancel recipient request" onPress={cancel} />
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
function Action({
  label,
  disabled = false,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  group: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#173E35' },
  note: { fontSize: 12, lineHeight: 19, color: '#68776F' },
  error: { fontSize: 15, lineHeight: 23, color: '#85472F' },
  input: {
    borderWidth: 1,
    borderColor: '#DCE3D7',
    borderRadius: 14,
    padding: 14,
    color: '#173E35',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  prefill: { alignSelf: 'flex-start', paddingVertical: 6 },
  prefillText: {
    fontSize: 13,
    color: '#24856B',
    textDecorationLine: 'underline',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panel: { padding: 16, gap: 12, backgroundColor: '#E9EFDD', borderRadius: 12 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 0,
    alignSelf: 'flex-start',
  },
  disabled: { opacity: 0.45 },
});
