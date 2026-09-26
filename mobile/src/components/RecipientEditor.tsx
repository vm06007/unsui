import { resolveEnsName } from '../lib/ensNames';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ToastAndroid,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PayoutNetwork } from '../lib/refundQuote';
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
  DEVELOPER_SUI_NAME,
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
  const automaticSwitch = useRef('');
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
    clearTimeout(lookupTimer.current);
    if (running.current || disabled) return;
    running.current = true;
    const current = ++epoch.current;
    setBusy(true);
    onBusy(true);
    setError('');
    if (action === 'resolve')
      onChange({ input: name, address: '', blocked: true });
    else onChange({ ...value, signed: undefined, blocked: true });
    let walletDestination = value;
    try {
      if (action === 'resolve') {
        abort.current = new AbortController();
        const result = await (network === 'sui'
          ? resolveSuiName
          : resolveEnsName)(name, abort.current.signal);
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
          let connection =
            action === 'switch'
              ? await switchDeviceWallet(network)
              : await connectDeviceWallet();
          if (current !== epoch.current) return;
          if (connection.chainId !== WALLET_CHAINS[network]) {
            connection = await switchDeviceWallet(network);
          }
          if (current !== epoch.current) return;
          walletDestination = {
            input: connection.address,
            address: connection.address,
            blocked: true,
            connection,
          };
          onChange(walletDestination);
          const signed = await signDeviceWallet(network, connection.address);
          if (current === epoch.current)
            onChange({ ...walletDestination, signed, blocked: false });
        }
      }
    } catch (failure) {
      if (current === epoch.current) {
        const message =
          failure instanceof Error
            ? failure.message
            : 'Request failed. Please retry.';
        if (Platform.OS === 'android' && action !== 'resolve') {
          ToastAndroid.show(message, ToastAndroid.LONG);
        } else setError(message);
        if (action !== 'resolve')
          onChange({ ...walletDestination, signed: undefined, blocked: true });
      }
    } finally {
      if (current === epoch.current) {
        running.current = false;
        setBusy(false);
        onBusy(false);
      }
    }
  };
  useEffect(() => {
    if (!mismatch || disabled || running.current) return;
    const attempt = `${network}:${value.connection?.address}`;
    if (automaticSwitch.current === attempt) return;
    automaticSwitch.current = attempt;
    void run('switch');
  }, [network, mismatch, disabled, value.connection?.address]);

  const edit = (text: string) => {
    clearTimeout(lookupTimer.current);
    if (
      text
        .trim()
        .toLowerCase()
        .endsWith(network === 'sui' ? '.sui' : '.eth')
    ) {
      lookupTimer.current = setTimeout(() => run('resolve', text), 500);
    }
    setError('');
    onChange(
      !text.trim().startsWith('0x')
        ? { input: text, address: '', blocked: true }
        : manualDestination(text),
    );
  };
  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {network === 'sui'
          ? 'Send to'
          : 'Wallet address or ENS name'}
      </Text>
      <View style={styles.inputContainer}>
        <TextInput
          testID="refund-recipient"
          accessibilityLabel="Recipient wallet address"
          value={value.input}
          onChangeText={edit}
          editable={!busy && !disabled}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder={
            network === 'sui' ? '0x… or yourname.sui' : '0x… or yourname.eth'
          }
          placeholderTextColor="#78856B"
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!value.input.trim().startsWith('0x')) run('resolve');
          }}
          style={[styles.input, styles.inputWithAction]}
        />
        {
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resolve recipient name"
            accessibilityState={{
              disabled:
                busy ||
                disabled ||
                !value.input.trim() ||
                value.input.trim().startsWith('0x'),
              busy,
            }}
            disabled={
              busy ||
              disabled ||
              !value.input.trim() ||
              value.input.trim().startsWith('0x')
            }
            onPress={() => run('resolve')}
            style={[
              styles.resolveButton,
              (disabled ||
                !value.input.trim() ||
                value.input.trim().startsWith('0x')) &&
                styles.disabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#214A37" />
            ) : (
              <Text style={styles.resolveText}>
                {value.resolved ? '✓' : 'Resolve'}
              </Text>
            )}
          </Pressable>
        }
      </View>
      {value.resolved && (
        <Text
          selectable
          style={styles.note}
          accessibilityLabel="Resolved recipient address"
        >
          {value.resolved.address}
        </Text>
      )}
      {network === 'sui' ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use developer address"
            disabled={busy || disabled}
            onPress={() => {
              run('resolve', DEVELOPER_SUI_NAME);
            }}
            style={styles.prefill}
          >
            <Text style={styles.prefillText}>Use developer address</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use vitally.eth"
            disabled={busy || disabled}
            onPress={() => run('resolve', 'vitally.eth')}
            style={styles.prefill}
          >
            <Text style={styles.prefillText}>Use vitally.eth</Text>
          </Pressable>
          <Text style={styles.note}>
            {available
              ? 'Or use your dGen1 wallet address.'
              : 'Enter a full address or resolve any .eth name above.'}
          </Text>
          {!value.connection && (
            <Action
              label="Use dGen1 wallet"
              disabled={disabled || busy || !available}
              onPress={() => run('connect')}
            />
          )}
          {value.connection && (
            <View style={styles.panel}>
              <View style={styles.walletRow}>
                <Text style={styles.label}>
                  dGen1 wallet / chain {value.connection.chainId}
                </Text>
                {mismatch && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Switch dGen1 network"
                    accessibilityState={{ disabled: busy || disabled }}
                    disabled={busy || disabled}
                    onPress={() => run('switch')}
                    style={[
                      styles.networkLink,
                      (busy || disabled) && styles.disabled,
                    ]}
                  >
                    <Text style={styles.prefillText}>Switch network</Text>
                  </Pressable>
                )}
              </View>
              {mismatch && (
                <Text accessibilityRole="alert" style={styles.error}>
                  Wallet network mismatch. Switch to{' '}
                  {network === 'ethereum'
                    ? 'Ethereum (1)'
                    : 'Mizuhiki Awaji (6497)'}{' '}
                  or use manual entry.
                </Text>
              )}

              {!mismatch && (
                <Action
                  label="Sign again"
                  disabled={busy || disabled}
                  onPress={() => run('sign')}
                />
              )}
            </View>
          )}
        </>
      )}
      {busy && (
        <View style={styles.group}>
          <ActivityIndicator color="#214A37" />
          <Text style={styles.note}>
            {evm && value.connection
              ? 'Check your dGen1 wallet…'
              : network === 'sui'
              ? 'Resolving SuiNS name…'
              : 'Resolving ENS name…'}
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
  inputContainer: { position: 'relative', justifyContent: 'center' },
  inputWithAction: { paddingRight: 90 },
  resolveButton: {
    position: 'absolute',
    right: 5,
    minWidth: 76,
    minHeight: 44,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#E9EFDD',
  },
  resolveText: { fontSize: 13, fontWeight: '600', color: '#214A37' },
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
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: 12,
  },
  networkLink: { minHeight: 44, justifyContent: 'center' },
  panel: { padding: 16, gap: 12, backgroundColor: '#E9EFDD', borderRadius: 12 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 0,
    alignSelf: 'flex-start',
  },
  disabled: { opacity: 0.45 },
});
