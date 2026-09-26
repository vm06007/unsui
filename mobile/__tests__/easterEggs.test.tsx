import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import HomeScreen from '../src/screens/HomeScreen';
import DemoReceiptScreen from '../src/screens/DemoReceiptScreen';
import { demoLedger } from '../src/lib/ledger';
import SuccessConfetti from '../src/components/SuccessConfetti';
import { createDemoQuote } from '../src/lib/refundQuote';
jest.mock('../src/lib/ledger', () => ({
  demoLedger: { reset: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../src/components/SuccessConfetti', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
let view: Renderer.ReactTestRenderer;
afterEach(async () => {
  await act(async () => view?.unmount());
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
test('logo reset needs three close taps and calls backend only once', async () => {
  const onReset = jest.fn(),
    onDemo = jest.fn();
  let now = 10000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  await act(async () => {
    view = Renderer.create(
      <HomeScreen
        scanning={false}
        onScan={() => {}}
        onCancel={() => {}}
        onDemo={onDemo}
        onReset={onReset}
        message=""
      />,
    );
  });
  // The original logo is a touchable wrapper around BrandMark.
  const logo = () =>
    view.root
      .findAllByProps({ accessibilityLabel: 'UnSui' })
      .find(n => typeof n.props.onPress === 'function')!
      .props.onPress();
  await act(async () => {
    logo();
    logo();
  });
  expect(demoLedger.reset).not.toHaveBeenCalled();
  now += 1600;
  await act(async () => logo());
  expect(demoLedger.reset).not.toHaveBeenCalled();
  await act(async () => {
    logo();
    return logo();
  });
  expect(demoLedger.reset).toHaveBeenCalledTimes(1);
  expect(onReset).toHaveBeenCalledTimes(1);
  expect(onDemo).not.toHaveBeenCalled();
});
test('three checkmark taps remount the original confetti', async () => {
  const receipt = {
    ...createDemoQuote('500', 1000, 'sui', `0x${'1'.repeat(64)}`),
    id: 'test',
    requestId: 'request',
    cardId: '0123456789abcdef',
    scannedBalanceJpy: 1000,
    remainingDemoJpy: 500,
    createdAt: '2026-09-25T12:00:00Z',
    status: 'simulated' as const,
  };
  await act(async () => {
    view = Renderer.create(
      <DemoReceiptScreen receipt={receipt} onClose={() => {}} />,
    );
  });
  const original = view.root.findByType(SuccessConfetti);
  const tap = () =>
    view.root
      .findAllByProps({ accessibilityLabel: 'Receipt saved' })
      .find(n => typeof n.props.onPress === 'function')!
      .props.onPress();
  await act(async () => {
    tap();
    tap();
  });
  expect(view.root.findByType(SuccessConfetti)).toBe(original);
  await act(async () => tap());
  expect(view.root.findByType(SuccessConfetti)).not.toBe(original);
});

test('confirmed payout shows exact amount and opens its mainnet transaction', async () => {
  const { Linking } = require('react-native');
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const digest = 'B2PUHvty7AC7S7ga6yyDxpdLifqkuViNhNJHy7iK2zHx';
  const receipt = {
    ...createDemoQuote('123', 1000, 'sui', `0x${'1'.repeat(64)}`),
    id: 'GM-000001',
    requestId: 'confirmed-request',
    cardId: '0123456789abcdef',
    scannedBalanceJpy: 1000,
    remainingDemoJpy: 877,
    createdAt: '2026-09-26T00:00:00Z',
    status: 'confirmed' as const,
    transactionDigest: digest,
    chainNetwork: 'mainnet' as const,
    chainReceiptId: `0x${'2'.repeat(64)}`,
    amountMist: '12054000',
  };
  await act(async () => {
    view = Renderer.create(
      <DemoReceiptScreen receipt={receipt} onClose={() => {}} />,
    );
  });
  const text = JSON.stringify(view.toJSON());
  expect(text).toContain('TRANSFER CONFIRMED');
  expect(text).toContain('0.012054');
  expect(text).toContain(digest);
  const link = view.root
    .findAllByProps({ accessibilityLabel: 'View transaction on SuiVision' })
    .find(n => typeof n.props.onPress === 'function');
  expect(link).toBeDefined();
  await act(async () => link!.props.onPress());
  expect(open).toHaveBeenCalledWith(`https://suivision.xyz/txblock/${digest}`);
});
