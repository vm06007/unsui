import { Platform, ToastAndroid } from 'react-native';
import { resolveEnsName } from '../src/lib/ensNames';
jest.mock('../src/lib/ensNames', () => ({ resolveEnsName: jest.fn() }));
import React, { useState } from 'react';
import Renderer, { act } from 'react-test-renderer';
import RecipientEditor, {
  manualDestination,
} from '../src/components/RecipientEditor';
import {
  connectDeviceWallet,
  isDeviceWalletAvailable,
  signDeviceWallet,
  switchDeviceWallet,
} from '../src/lib/deviceWallet';
import { resolveSuiName } from '../src/lib/suiNames';
import { PayoutNetwork } from '../src/lib/refundQuote';
jest.mock('../src/lib/deviceWallet', () => ({
  ...jest.requireActual('../src/lib/deviceWallet'),
  isDeviceWalletAvailable: jest.fn(),
  connectDeviceWallet: jest.fn(),
  switchDeviceWallet: jest.fn(),
  signDeviceWallet: jest.fn(),
  cancelDeviceWallet: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/lib/suiNames', () => ({
  DEVELOPER_SUI_NAME: 'kartik.sui',
  OPERATOR_SUI_ADDRESS: '0x8e305ff1ca0058eb7462fe56011a78774966577b09f4f32e96d0d7fa589c1f4a',
  resolveSuiName: jest.fn(),
}));
let view: Renderer.ReactTestRenderer;
const onBusy = jest.fn();
function Harness({ network }: { network: PayoutNetwork }) {
  const [value, setValue] = useState(manualDestination);
  return (
    <RecipientEditor
      network={network}
      value={value}
      onChange={setValue}
      onBusy={onBusy}
    />
  );
}
const props = () => view.root.findByType(RecipientEditor).props;
const button = (label: string) =>
  view.root
    .findAllByProps({ accessibilityLabel: label })
    .find(n => typeof n.props.onPress === 'function')!;
const mount = async (network: PayoutNetwork) =>
  act(async () => {
    view = Renderer.create(<Harness network={network} />);
  });
beforeEach(() => {
  jest.clearAllMocks();
  (isDeviceWalletAvailable as jest.Mock).mockResolvedValue(true);
});
afterEach(async () => {
  await act(async () => view?.unmount());
});
test('developer name resolves directly into the recipient without a second confirmation', async () => {
  const address = `0x${'1'.repeat(64)}`;
  (resolveSuiName as jest.Mock).mockResolvedValue({
    name: 'kartik.sui',
    address,
    network: 'mainnet',
  });
  await mount('sui');
  await act(async () => button('Use developer wallet').props.onPress());
  expect(props().value.input).toBe('kartik.sui');
  expect(props().value.address).toBe(address);
  expect(props().value.blocked).toBe(false);
});
test('cancelled lookup cannot fill a recipient when its late response arrives', async () => {
  let resolve!: (v: unknown) => void;
  (resolveSuiName as jest.Mock).mockImplementationOnce(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  await mount('sui');
  await act(async () => {
    button('Use developer wallet').props.onPress();
  });
  await act(async () => button('Cancel recipient request').props.onPress());
  await act(async () =>
    resolve({
      name: 'kartik.sui',
      address: `0x${'1'.repeat(64)}`,
      network: 'mainnet',
    }),
  );
  expect(props().value.address).toBe('');
  expect(props().value.resolved).toBeUndefined();
});
test('handles dGen1 mismatch, network switching, optional signature and manual edits', async () => {
  const address = `0x${'1'.repeat(40)}`;
  (connectDeviceWallet as jest.Mock).mockResolvedValue({ address, chainId: 1 });
  (switchDeviceWallet as jest.Mock).mockResolvedValue({
    address,
    chainId: 6497,
  });
  (signDeviceWallet as jest.Mock).mockResolvedValue({
    address,
    chainId: 6497,
    message: 'demo only',
    signature: 'signature',
  });
  await mount('mizuhiki');
  await act(async () => button('Use dGen1 wallet').props.onPress());
  expect(switchDeviceWallet).toHaveBeenCalledWith('mizuhiki');
  expect(props().value.blocked).toBe(false);
  expect(props().value.signed).toBeDefined();
  expect(button('Reconnect dGen1 wallet')).toBeUndefined();
  expect(button('Use manual entry')).toBeUndefined();
  await act(async () => button('Sign again').props.onPress());
  expect(signDeviceWallet).toHaveBeenCalledTimes(2);
  await act(async () =>
    view.root
      .findAllByProps({ testID: 'refund-recipient' })
      .find(n => typeof n.props.onChangeText === 'function')!
      .props.onChangeText(`0x${'2'.repeat(40)}`),
  );
  expect(props().value.signed).toBeUndefined();
  expect(props().value.connection).toBeUndefined();
});

test('typing a name resolves automatically and editing clears its destination', async () => {
  jest.useFakeTimers();
  try {
    const address = `0x${'2'.repeat(64)}`;
    (resolveSuiName as jest.Mock).mockResolvedValue({
      name: 'kartik.sui',
      address,
      network: 'mainnet',
    });
    await mount('sui');
    await act(async () =>
      view.root
        .findByProps({ testID: 'refund-recipient' })
        .props.onChangeText('kartik.sui'),
    );
    expect(props().value.blocked).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(props().value.address).toBe(address);
    expect(props().value.blocked).toBe(false);
    await act(async () =>
      view.root
        .findByProps({ testID: 'refund-recipient' })
        .props.onChangeText('another.sui'),
    );
    expect(props().value.address).toBe('');
    expect(props().value.blocked).toBe(true);
    await act(async () => view.unmount());
  } finally {
    jest.useRealTimers();
  }
});

test.each(['ethereum', 'mizuhiki'] as const)(
  'resolves a typed ENS name on %s without connecting dGen1',
  async network => {
    const address = `0x${'3'.repeat(40)}`;
    (resolveEnsName as jest.Mock).mockResolvedValue({
      name: 'test.eth',
      address,
      network: 'mainnet',
    });
    await mount(network);
    await act(async () =>
      view.root
        .findByProps({ testID: 'refund-recipient' })
        .props.onChangeText('test.eth'),
    );
    expect(props().value.blocked).toBe(true);
    await act(async () => button('Resolve recipient name').props.onPress());
    expect(props().value.address).toBe(address);
    expect(props().value.blocked).toBe(false);
    expect(connectDeviceWallet).not.toHaveBeenCalled();
    await act(async () =>
      view.root
        .findByProps({ testID: 'refund-recipient' })
        .props.onChangeText('other.eth'),
    );
    expect(props().value.address).toBe('');
    expect(props().value.resolved).toBeUndefined();
  },
);

test('declined automatic signing uses a toast and blocks the wallet recipient until retry', async () => {
  Object.defineProperty(Platform, 'OS', {
    value: 'android',
    configurable: true,
  });
  const toast = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
  const address = `0x${'4'.repeat(40)}`;
  (connectDeviceWallet as jest.Mock).mockResolvedValue({ address, chainId: 1 });
  (signDeviceWallet as jest.Mock).mockRejectedValueOnce(
    Error('Wallet signing declined.'),
  );
  await mount('ethereum');
  await act(async () => button('Use dGen1 wallet').props.onPress());
  expect(toast).toHaveBeenCalledWith(
    'Wallet signing declined.',
    ToastAndroid.LONG,
  );
  expect(props().value.address).toBe(address);
  expect(props().value.blocked).toBe(true);
  expect(props().value.signed).toBeUndefined();
  (signDeviceWallet as jest.Mock).mockResolvedValueOnce({ address, chainId: 1 });
  await act(async () => button('Sign again').props.onPress());
  expect(props().value.blocked).toBe(false);
  toast.mockRestore();
});


test.each<PayoutNetwork>(['ethereum', 'mizuhiki'])(
  'quick ENS prefill on %s stays independent of dGen1 and allows manual replacement',
  async network => {
    const address = `0x${'4'.repeat(40)}`;
    (resolveEnsName as jest.Mock).mockResolvedValue({ name: 'vitally.eth', address, network: 'mainnet' });
    await mount(network);
    await act(async () => button('Use vitally.eth').props.onPress());
    expect(resolveEnsName).toHaveBeenCalledWith('vitally.eth', expect.anything());
    expect(props().value.address).toBe(address);
    expect(props().value.blocked).toBe(false);
    expect(connectDeviceWallet).not.toHaveBeenCalled();
    const manual = `0x${'5'.repeat(40)}`;
    await act(async () => view.root.findByProps({testID: 'refund-recipient'}).props.onChangeText(manual));
    expect(props().value.address).toBe(manual);
    expect(props().value.resolved).toBeUndefined();
    expect(props().value.signed).toBeUndefined();
  },
);


test('changing networks with a connected wallet requests the selected chain automatically', async () => {
  const address = `0x${'1'.repeat(40)}`;
  (connectDeviceWallet as jest.Mock).mockResolvedValue({ address, chainId: 1 });
  (switchDeviceWallet as jest.Mock).mockResolvedValue({ address, chainId: 6497 });
  await mount('ethereum');
  await act(async () => button('Use dGen1 wallet').props.onPress());
  await act(async () => view.update(<Harness network="mizuhiki" />));
  expect(switchDeviceWallet).toHaveBeenCalledWith('mizuhiki');
  expect(props().value.connection.chainId).toBe(6497);
  expect(props().value.blocked).toBe(false);
});


test('operator shortcut selects the mainnet operator without resolving a name', async () => {
  await mount('sui');
  await act(async () => button('Use operator wallet').props.onPress());
  expect(props().value).toEqual(manualDestination('0x8e305ff1ca0058eb7462fe56011a78774966577b09f4f32e96d0d7fa589c1f4a'));
  expect(resolveSuiName).not.toHaveBeenCalled();
});

test('operator shortcut cancels a scheduled name lookup so it cannot overwrite the selection', async () => {
  jest.useFakeTimers();
  try {
    await mount('sui');
    await act(async () => view.root.findByProps({ testID: 'refund-recipient' }).props.onChangeText('kartik.sui'));
    await act(async () => button('Use operator wallet').props.onPress());
    await act(async () => jest.advanceTimersByTime(600));
    expect(props().value.address).toBe('0x8e305ff1ca0058eb7462fe56011a78774966577b09f4f32e96d0d7fa589c1f4a');
    expect(resolveSuiName).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
