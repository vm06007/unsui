import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RefundQuoteScreen from '../src/screens/RefundQuoteScreen';
let view: Renderer.ReactTestRenderer;
import { readCard, cancelScan } from '../src/lib/suica';
import { demoLedger } from '../src/lib/ledger';
jest.mock('../src/lib/ledger', () => ({
  demoLedger: { record: jest.fn() },
}));
jest.mock('../src/lib/suica', () => ({
  readCard: jest.fn(),
  cancelScan: jest.fn().mockResolvedValue(undefined),
}));
const onRecorded = jest.fn();
const onClose = jest.fn();
const address = `0x${'1'.repeat(64)}`;
const button = (label: string) =>
  view.root
    .findAllByProps({ accessibilityLabel: label })
    .find(node => typeof node.props.onPress === 'function')!;
const input = (testID: string) =>
  view.root
    .findAllByProps({ testID })
    .find(node => typeof node.props.onChangeText === 'function')!;
beforeEach(async () => {
  await act(async () => {
    view = Renderer.create(
      <RefundQuoteScreen
        balanceJpy={575}
        scannedBalanceJpy={575}
        cardId="0123456789abcdef"
        onClose={onClose}
        onRecorded={onRecorded}
      />,
    );
  });
});
afterEach(async () => {
  await act(async () => view.unmount());
  jest.clearAllMocks();
});

test('invalid amounts and recipients stay on the form with useful errors', async () => {
  await act(async () => {
    input('refund-amount').props.onChangeText('1000');
    button('Review demo quote').props.onPress();
  });
  // Review again after the edited state has rendered.
  await act(async () => button('Review demo quote').props.onPress());
  expect(JSON.stringify(view.toJSON())).toContain('cannot exceed');
  expect(JSON.stringify(view.toJSON())).toContain('64 hexadecimal');
  expect(view.root.findAllByProps({ testID: 'quote-payout' })).toHaveLength(0);
});
test('reviews an exact quote, preserves edits when going back, and closes without sending funds', async () => {
  await act(async () => input('refund-recipient').props.onChangeText(address));
  await act(async () => button('Review demo quote').props.onPress());
  const output = JSON.stringify(view.toJSON());
  expect(output).toContain('0.05635');
  expect(output).toContain(address);
  expect(output).toContain('11.5');
  expect(output).toContain('NO FUNDS SENT');
  await act(async () => button('Edit quote').props.onPress());
  expect(input('refund-recipient').props.value).toBe(address);
  await act(async () => input('refund-amount').props.onChangeText('245'));
  await act(async () => button('Review demo quote').props.onPress());
  expect(JSON.stringify(view.toJSON())).toContain('0.02401');
  await act(async () => button('Edit quote').props.onPress());
  await act(async () => button('Back to card').props.onPress());
  expect(onClose).toHaveBeenCalledTimes(1);
});
test('changing chains clears the recipient and applies the selected asset and address length', async () => {
  await act(async () => input('refund-recipient').props.onChangeText(address));
  await act(async () => button('Ethereum').props.onPress());
  expect(input('refund-recipient').props.value).toBe('');
  await act(async () =>
    input('refund-recipient').props.onChangeText(`0x${'2'.repeat(40)}`),
  );
  await act(async () => button('Review demo quote').props.onPress());
  expect(JSON.stringify(view.toJSON())).toContain('0.001127');
  expect(JSON.stringify(view.toJSON())).toContain('ETH');
  await act(async () => button('Edit quote').props.onPress());
  await act(async () => button('Mizuhiki').props.onPress());
  expect(input('refund-recipient').props.value).toBe('');
  expect(JSON.stringify(view.toJSON())).toContain('Awaji Testnet');
});

async function review() {
  await act(async () => input('refund-recipient').props.onChangeText(address));
  await act(async () => button('Review demo quote').props.onPress());
}
test('requires the same unchanged card before persisting a simulated refund', async () => {
  await review();
  (readCard as jest.Mock).mockResolvedValueOnce({
    idm: '1123456789abcdef',
    balanceJpy: 575,
  });
  await act(async () => button('Confirm simulated refund').props.onPress());
  expect(JSON.stringify(view.toJSON())).toContain('different card');
  expect(demoLedger.record).not.toHaveBeenCalled();
  (readCard as jest.Mock).mockResolvedValueOnce({
    idm: '0123456789abcdef',
    balanceJpy: 574,
  });
  await act(async () => button('Confirm simulated refund').props.onPress());
  expect(JSON.stringify(view.toJSON())).toContain('balance changed');
  expect(demoLedger.record).not.toHaveBeenCalled();
  (readCard as jest.Mock).mockResolvedValueOnce({
    idm: '0123456789abcdef',
    balanceJpy: 575,
  });
  (demoLedger.record as jest.Mock).mockResolvedValueOnce({
    id: 'DEMO-000001',
    status: 'simulated',
  });
  await act(async () => button('Confirm simulated refund').props.onPress());
  expect(demoLedger.record).toHaveBeenCalledTimes(1);
  expect(onRecorded).toHaveBeenCalledWith({
    id: 'DEMO-000001',
    status: 'simulated',
  });
});
test('cancellation ignores a late NFC response and saves nothing', async () => {
  await review();
  let resolve!: (value: unknown) => void;
  (readCard as jest.Mock).mockImplementationOnce(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  await act(async () => {
    button('Confirm simulated refund').props.onPress();
  });
  await act(async () => button('Cancel confirmation').props.onPress());
  await act(async () => resolve({ idm: '0123456789abcdef', balanceJpy: 575 }));
  expect(cancelScan).toHaveBeenCalled();
  expect(demoLedger.record).not.toHaveBeenCalled();
  expect(onRecorded).not.toHaveBeenCalled();
  expect(button('Confirm simulated refund').props.disabled).toBe(false);
});
test('a storage failure retries the same request and guards rapid double taps', async () => {
  await review();
  (readCard as jest.Mock).mockResolvedValue({
    idm: '0123456789abcdef',
    balanceJpy: 575,
  });
  (demoLedger.record as jest.Mock)
    .mockRejectedValueOnce(Error('Could not save'))
    .mockResolvedValueOnce({ id: 'DEMO-000001' });
  await act(async () => {
    const pending = button('Confirm simulated refund').props.onPress();
    button('Confirm simulated refund').props.onPress();
    await pending;
  });
  expect(demoLedger.record).toHaveBeenCalledTimes(1);
  const first = (demoLedger.record as jest.Mock).mock.calls[0][0].requestId;
  await act(async () => button('Confirm simulated refund').props.onPress());
  expect((demoLedger.record as jest.Mock).mock.calls[1][0].requestId).toBe(
    first,
  );
  expect(onRecorded).toHaveBeenCalledTimes(1);
});
test('times out confirmation without recording a refund', async () => {
  jest.useFakeTimers();
  try {
    await review();
    let resolve!: (value: unknown) => void;
    (readCard as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(r => {
          resolve = r;
        }),
    );
    await act(async () => {
      button('Confirm simulated refund').props.onPress();
    });
    await act(async () => {
      jest.advanceTimersByTime(25000);
    });
    expect(JSON.stringify(view.toJSON())).toContain('timed out');
    await act(async () =>
      resolve({ idm: '0123456789abcdef', balanceJpy: 575 }),
    );
    expect(demoLedger.record).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});

test('unmount during confirmation ignores any later card response', async () => {
  await review();
  let resolve!: (value: unknown) => void;
  (readCard as jest.Mock).mockImplementationOnce(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  await act(async () => {
    button('Confirm simulated refund').props.onPress();
  });
  await act(async () => view.unmount());
  await act(async () => resolve({ idm: '0123456789abcdef', balanceJpy: 575 }));
  expect(demoLedger.record).not.toHaveBeenCalled();
  expect(onRecorded).not.toHaveBeenCalled();
});

test('explicit sample-card mode confirms without invoking NFC', async () => {
  await act(async () =>
    view.update(
      <RefundQuoteScreen
        isSample
        balanceJpy={1500}
        scannedBalanceJpy={1500}
        cardId="ffffffffffffffff"
        onClose={onClose}
        onRecorded={onRecorded}
      />,
    ),
  );
  (demoLedger.record as jest.Mock).mockResolvedValue({ id: 'DEMO-SAMPLE' });
  await act(async () => input('refund-recipient').props.onChangeText(address));
  await act(async () => button('Review demo quote').props.onPress());
  expect(JSON.stringify(view.toJSON())).toContain('without NFC');
  await act(async () => button('Confirm simulated refund').props.onPress());
  expect(readCard).not.toHaveBeenCalled();
  expect(demoLedger.record).toHaveBeenCalledWith(
    expect.objectContaining({
      cardId: 'ffffffffffffffff',
      confirmedCardId: 'ffffffffffffffff',
    }),
  );
  expect(onRecorded).toHaveBeenCalledWith({ id: 'DEMO-SAMPLE' });
});
