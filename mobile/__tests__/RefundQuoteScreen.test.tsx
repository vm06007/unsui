jest.mock('../src/lib/backendLedger', () => ({
  backendRequest: jest.fn(async (_url, _path, input) => {
    const { createDemoQuote, marketAmountMist, formatMist } =
      jest.requireActual('../src/lib/refundQuote');
    const quote = createDemoQuote(
      String(input.amountJpy),
      input.scannedBalanceJpy,
      'sui',
      input.recipient,
    );
    const amountMist = marketAmountMist(input.amountJpy, '200000000');
    return {
      quote: {
        ...quote,
        estimatedCrypto: formatMist(amountMist),
        pricing: {
          source: 'coingecko',
          jpyPerSuiMicros: '200000000',
          priceTimestamp: Math.floor(Date.now() / 1000),
          issuedAt: Date.now(),
          expiresAt: Date.now() + 300000,
          amountMist,
          cardId: input.cardId,
          scannedBalanceJpy: input.scannedBalanceJpy,
          signature: 'a'.repeat(64),
        },
      },
    };
  }),
}));
jest.mock('../src/lib/worldId', () => ({
  verifyRefundHuman: jest.fn().mockResolvedValue(undefined),
}));
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RefundQuoteScreen from '../src/screens/RefundQuoteScreen';
let view: Renderer.ReactTestRenderer;
import { readCard, cancelScan } from '../src/lib/suica';
import { demoLedger } from '../src/lib/ledger';
jest.mock('../src/lib/ledger', () => ({
  demoLedger: { prepare: jest.fn(async input => input), record: jest.fn() },
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

test('invalid recipient cannot start confirmation', async () => {
  await act(async () => button('Confirm refund').props.onPress());
  expect(view.root.findAllByProps({ testID: 'refund-amount' })).toHaveLength(0);
  expect(readCard).not.toHaveBeenCalled();
  expect(demoLedger.record).not.toHaveBeenCalled();
});
test('shows the fee and payout inline, and closes without recording', async () => {
  await act(async () => input('refund-recipient').props.onChangeText(address));
  expect(JSON.stringify(view.toJSON())).toContain('2.8175');
  expect(JSON.stringify(view.toJSON())).toContain('11.5');
  await act(async () => button('Back to card').props.onPress());
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(demoLedger.record).not.toHaveBeenCalled();
});
test('switching networks resets the destination and updates the inline estimate', async () => {
  await act(async () => input('refund-recipient').props.onChangeText(address));
  await act(async () => button('Change payout network').props.onPress());
  await act(async () => button('Ethereum').props.onPress());
  expect(input('refund-recipient').props.value).toBe('');
  expect(JSON.stringify(view.toJSON())).toContain('0.001127');
  await act(async () => button('Change payout network').props.onPress());
  await act(async () => button('Mizuhiki').props.onPress());
  expect(input('refund-recipient').props.value).toBe('');
});

async function review() {
  await act(async () => input('refund-recipient').props.onChangeText(address));
}
test('requires the same unchanged card before persisting a simulated refund', async () => {
  await review();
  (readCard as jest.Mock).mockResolvedValueOnce({
    idm: '1123456789abcdef',
    balanceJpy: 575,
  });
  await act(async () => button('Confirm refund').props.onPress());
  expect(JSON.stringify(view.toJSON())).toContain('different card');
  expect(demoLedger.record).not.toHaveBeenCalled();
  (readCard as jest.Mock).mockResolvedValueOnce({
    idm: '0123456789abcdef',
    balanceJpy: 574,
  });
  await act(async () => button('Confirm refund').props.onPress());
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
  await act(async () => button('Confirm refund').props.onPress());
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
    button('Confirm refund').props.onPress();
  });
  await act(async () => button('Cancel scan').props.onPress());
  await act(async () => resolve({ idm: '0123456789abcdef', balanceJpy: 575 }));
  expect(cancelScan).toHaveBeenCalled();
  expect(demoLedger.record).not.toHaveBeenCalled();
  expect(onRecorded).not.toHaveBeenCalled();
  expect(button('Confirm refund').props.disabled).toBe(false);
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
    const pending = button('Confirm refund').props.onPress();
    button('Confirm refund').props.onPress();
    await pending;
  });
  expect(demoLedger.record).toHaveBeenCalledTimes(1);
  const first = (demoLedger.record as jest.Mock).mock.calls[0][0].requestId;
  await act(async () => button('Confirm refund').props.onPress());
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
      button('Confirm refund').props.onPress();
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
    button('Confirm refund').props.onPress();
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
  expect(JSON.stringify(view.toJSON())).toContain('without NFC');
  await act(async () => button('Confirm refund').props.onPress());
  expect(readCard).not.toHaveBeenCalled();
  expect(demoLedger.record).toHaveBeenCalledWith(
    expect.objectContaining({
      cardId: 'ffffffffffffffff',
      confirmedCardId: 'ffffffffffffffff',
    }),
  );
  expect(onRecorded).toHaveBeenCalledWith({ id: 'DEMO-SAMPLE' });
});

test('1112 yen waits for World ID before starting the confirmation scan', async () => {
  const { verifyRefundHuman } = require('../src/lib/worldId');
  let approve!: (value: string) => void;
  verifyRefundHuman.mockImplementationOnce(
    () =>
      new Promise<string>(resolve => {
        approve = resolve;
      }),
  );
  await act(async () => {
    view.unmount();
    view = Renderer.create(
      <RefundQuoteScreen
        balanceJpy={1112}
        scannedBalanceJpy={1112}
        cardId="0123456789abcdef"
        onClose={onClose}
        onRecorded={onRecorded}
      />,
    );
  });
  await act(async () => input('refund-recipient').props.onChangeText(address));
  await act(async () => {
    button('Confirm refund').props.onPress();
  });
  expect(JSON.stringify(view.toJSON())).toContain('One quick human check');
  expect(readCard).not.toHaveBeenCalled();
  expect(demoLedger.record).not.toHaveBeenCalled();
  (readCard as jest.Mock).mockResolvedValueOnce({
    idm: '0123456789abcdef',
    balanceJpy: 1112,
  });
  (demoLedger.record as jest.Mock).mockResolvedValueOnce({ id: 'GM-000001' });
  await act(async () => approve('approved-session'));
  expect(demoLedger.record).toHaveBeenCalledWith(
    expect.objectContaining({
      worldVerificationId: 'approved-session',
      quote: expect.objectContaining({ amountJpy: 1112 }),
    }),
  );
});
test('cancelled human check cannot start NFC or save a refund even if approval arrives late', async () => {
  const { verifyRefundHuman } = require('../src/lib/worldId');
  let approve!: (value: string) => void;
  verifyRefundHuman.mockImplementationOnce(
    () =>
      new Promise<string>(resolve => {
        approve = resolve;
      }),
  );
  await act(async () => {
    view.unmount();
    view = Renderer.create(
      <RefundQuoteScreen
        balanceJpy={1112}
        scannedBalanceJpy={1112}
        cardId="0123456789abcdef"
        onClose={onClose}
        onRecorded={onRecorded}
      />,
    );
  });
  await act(async () => input('refund-recipient').props.onChangeText(address));
  await act(async () => {
    button('Confirm refund').props.onPress();
  });
  await act(async () => button('Cancel human check').props.onPress());
  await act(async () => approve('late-session'));
  expect(readCard).not.toHaveBeenCalled();
  expect(demoLedger.record).not.toHaveBeenCalled();
});

test('shows issuing screen until the backend confirms and restores review on failure', async () => {
  await review();
  (readCard as jest.Mock).mockResolvedValue({
    idm: '0123456789abcdef',
    balanceJpy: 575,
  });
  let reject!: (error: Error) => void;
  (demoLedger.record as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await act(async () => {
    button('Confirm refund').props.onPress();
  });
  expect(JSON.stringify(view.toJSON())).toContain('Issuing refund');
  expect(
    view.root.findAllByProps({ accessibilityLabel: 'Confirm refund' }),
  ).toHaveLength(0);
  expect(onRecorded).not.toHaveBeenCalled();
  await act(async () => reject(Error('Please retry this request')));
  expect(JSON.stringify(view.toJSON())).not.toContain('Issuing refund');
  expect(JSON.stringify(view.toJSON())).toContain('Please retry this request');
  expect(button('Confirm refund').props.disabled).toBe(false);
});
