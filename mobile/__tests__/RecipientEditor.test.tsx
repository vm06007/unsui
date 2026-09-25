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
import { randomDemoName, resolveSuiName } from '../src/lib/suiNames';
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
  randomDemoName: jest.fn(),
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
test('demo name resolves but must be selected before it becomes a recipient', async () => {
  const address = `0x${'1'.repeat(64)}`;
  (randomDemoName as jest.Mock).mockReturnValue('kartik.sui');
  (resolveSuiName as jest.Mock).mockResolvedValue({
    name: 'kartik.sui',
    address,
    network: 'mainnet',
  });
  await mount('sui');
  await act(async () => button('Use example name').props.onPress());
  expect(props().value.input).toBe('kartik.sui');
  expect(props().value.address).toBe('');
  expect(props().value.blocked).toBe(true);
  await act(async () => button('Use resolved address').props.onPress());
  expect(props().value.address).toBe(address);
  expect(props().value.blocked).toBe(false);
});
test('cancelled lookup cannot fill a recipient when its late response arrives', async () => {
  let resolve!: (v: unknown) => void;
  (randomDemoName as jest.Mock).mockReturnValue('vitally.sui');
  (resolveSuiName as jest.Mock).mockImplementationOnce(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  await mount('sui');
  await act(async () => {
    button('Use example name').props.onPress();
  });
  await act(async () => button('Cancel recipient request').props.onPress());
  await act(async () =>
    resolve({
      name: 'vitally.sui',
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
  await act(async () => button('Connect dGen1 wallet').props.onPress());
  expect(props().value.blocked).toBe(true);
  await act(async () => button('Switch dGen1 network').props.onPress());
  expect(props().value.blocked).toBe(false);
  await act(async () =>
    button('Sign destination message (optional)').props.onPress(),
  );
  expect(props().value.signed).toBeDefined();
  await act(async () =>
    view.root
      .findAllByProps({ testID: 'refund-recipient' })
      .find(n => typeof n.props.onChangeText === 'function')!
      .props.onChangeText(`0x${'2'.repeat(40)}`),
  );
  expect(props().value.signed).toBeUndefined();
  expect(props().value.connection).toBeUndefined();
});
