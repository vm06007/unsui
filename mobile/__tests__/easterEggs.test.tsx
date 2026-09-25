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
