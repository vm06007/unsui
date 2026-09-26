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
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';
import { showScanError } from '../src/lib/scanFeedback';
jest.mock('../src/lib/scanFeedback', () => ({ showScanError: jest.fn() }));
import { demoLedger } from '../src/lib/ledger';
import { createDemoQuote } from '../src/lib/refundQuote';
import { readCard, cancelScan } from '../src/lib/suica';
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/lib/suica', () => ({
  readCard: jest.fn(),
  cancelScan: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/lib/ledger', () => ({
  demoLedger: {
    prepare: jest.fn(async input => input),
    list: jest.fn().mockResolvedValue([]),
    record: jest.fn(),
  },
}));
let view: ReactTestRenderer.ReactTestRenderer;
afterEach(async () => {
  await act(async () => view?.unmount());
  jest.clearAllMocks();
});
test('scan shows the actual balance and allows another scan', async () => {
  (readCard as jest.Mock).mockResolvedValue({
    idm: '0123456789abcdef',
    balanceJpy: 575,
    history: [],
    historyLimited: false,
  });
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    await view.root
      .findAllByProps({ accessibilityLabel: 'Scan transit card' })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  });
  expect(JSON.stringify(view.toJSON())).toContain('575');
  expect(JSON.stringify(view.toJSON())).toContain('Scan again');
});
test('cancel ignores a late card response', async () => {
  let resolve!: (value: unknown) => void;
  (readCard as jest.Mock).mockImplementation(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    view.root
      .findAllByProps({ accessibilityLabel: 'Scan transit card' })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  });
  await act(async () => {
    view.root
      .findAllByProps({ accessibilityLabel: 'Cancel scan' })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  });
  await act(async () => {
    resolve({
      idm: '0123456789abcdef',
      balanceJpy: 575,
      history: [],
      historyLimited: false,
    });
  });
  expect(JSON.stringify(view.toJSON())).not.toContain('575');
  expect(showScanError).not.toHaveBeenCalled();
  expect(cancelScan).toHaveBeenCalled();
});

test('history tab shows records and a partial-read notice without another scan', async () => {
  (readCard as jest.Mock).mockResolvedValue({
    idm: '0123456789abcdef',
    balanceJpy: 575,
    historyLimited: true,
    history: [
      {
        index: 0,
        date: '2026-09-25',
        activity: 'Rail travel',
        balanceJpy: 575,
        changeJpy: -245,
        entry: 'Shibuya',
        exit: 'Toranomon',
        terminal: 9,
        process: 1,
      },
    ],
  });
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    await view.root
      .findAllByProps({ accessibilityLabel: 'Scan transit card' })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  });
  await act(async () => {
    view.root
      .findAllByProps({ accessibilityLabel: 'Card history' })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  });
  const output = JSON.stringify(view.toJSON());
  expect(output).toContain('Shibuya');
  expect(output).toContain('Toranomon');
  expect(output).toContain('Only part of the history');
  expect(readCard).toHaveBeenCalledTimes(1);
});

test('opens and closes the refund flow without changing the scanned card', async () => {
  (readCard as jest.Mock).mockResolvedValue({
    idm: '0123456789abcdef',
    balanceJpy: 575,
    history: [],
    historyLimited: false,
  });
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    await view.root
      .findAllByProps({ accessibilityLabel: 'Scan transit card' })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  });
  const press = (label: string) =>
    view.root
      .findAllByProps({ accessibilityLabel: label })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  await act(async () => press('Preview refund'));
  expect(JSON.stringify(view.toJSON())).toContain('Send to');
  await act(async () => press('Back to card'));
  expect(JSON.stringify(view.toJSON())).toContain('575');
  expect(JSON.stringify(view.toJSON())).toContain('Scan again');
  expect(readCard).toHaveBeenCalledTimes(1);
});
test('a zero balance cannot open a refund quote', async () => {
  (readCard as jest.Mock).mockResolvedValue({
    idm: '0123456789abcdef',
    balanceJpy: 0,
    history: [],
    historyLimited: false,
  });
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    await view.root
      .findAllByProps({ accessibilityLabel: 'Scan transit card' })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  });
  const preview = view.root
    .findAllByProps({ accessibilityLabel: 'Preview refund' })
    .find(node => typeof node.props.onPress === 'function')!;
  expect(preview.props.disabled).toBe(true);
  expect(JSON.stringify(view.toJSON())).toContain('No balance available');
});

test('records a refund, shows its receipt and reduces only the demo allowance', async () => {
  (demoLedger.list as jest.Mock).mockResolvedValue([]);
  (readCard as jest.Mock).mockResolvedValue({
    idm: '0123456789abcdef',
    balanceJpy: 1000,
    history: [],
    historyLimited: false,
  });
  const recipient = `0x${'1'.repeat(64)}`;
  const receipt = {
    ...createDemoQuote('1000', 1000, 'sui', recipient),
    id: 'DEMO-000001',
    requestId: 'request',
    cardId: '0123456789abcdef',
    scannedBalanceJpy: 1000,
    remainingDemoJpy: 0,
    createdAt: '2026-09-25T12:00:00.000Z',
    status: 'simulated',
  };
  (demoLedger.record as jest.Mock).mockImplementation(async () => {
    (demoLedger.list as jest.Mock).mockResolvedValue([receipt]);
    return receipt;
  });
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    await view.root
      .findAllByProps({ accessibilityLabel: 'Scan transit card' })
      .find(node => typeof node.props.onPress === 'function')!
      .props.onPress();
  });
  const press = (label: string) =>
    view.root
      .findAllByProps({ accessibilityLabel: label })
      .find(n => typeof n.props.onPress === 'function')!
      .props.onPress();
  const edit = (testID: string, value: string) =>
    view.root
      .findAllByProps({ testID })
      .find(n => typeof n.props.onChangeText === 'function')!
      .props.onChangeText(value);
  await act(async () => press('Preview refund'));
  await act(async () => {
    edit('refund-recipient', recipient);
  });
  await act(async () => press('Confirm refund'));
  expect(JSON.stringify(view.toJSON())).toContain('A little goes further.');
  expect(JSON.stringify(view.toJSON())).toContain('DEMO-000001');
  await act(async () => press('Close receipt'));
  expect(JSON.stringify(view.toJSON())).toContain('Available for refunds: ¥0');
  expect(
    view.root.findAllByProps({ accessibilityLabel: '1000 yen' }).length,
  ).toBeGreaterThan(0);
  await act(async () => press('Card history'));
  expect(JSON.stringify(view.toJSON())).toContain('UnSui service');
  expect(JSON.stringify(view.toJSON())).toContain('SUI refund');
  await act(async () => press('SUI refund DEMO-000001'));
  expect(JSON.stringify(view.toJSON())).toContain(recipient);
  expect(JSON.stringify(view.toJSON())).toContain('Available after');
  await act(async () => press('Open menu'));
  await act(async () => press('Open receipts'));
  await act(async () => press('View DEMO-000001'));
  expect(JSON.stringify(view.toJSON())).toContain('A little goes further.');
  await act(async () => press('Close receipt'));
  expect(JSON.stringify(view.toJSON())).toContain('Your receipts.');
});
test('saved refunds restore the allowance on a new app mount', async () => {
  const receipt = {
    ...createDemoQuote('1000', 1000, 'sui', `0x${'1'.repeat(64)}`),
    id: 'DEMO-000001',
    requestId: 'request',
    cardId: '0123456789abcdef',
    scannedBalanceJpy: 1000,
    remainingDemoJpy: 0,
    createdAt: '2026-09-25T12:00:00.000Z',
    status: 'simulated',
  };
  (demoLedger.list as jest.Mock).mockResolvedValue([receipt]);
  (readCard as jest.Mock).mockResolvedValueOnce({
    idm: '0123456789abcdef',
    balanceJpy: 1000,
    history: [],
    historyLimited: false,
  });
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  const scan = view.root
    .findAllByProps({ accessibilityLabel: 'Scan transit card' })
    .find(n => typeof n.props.onPress === 'function')!;
  await act(async () => scan.props.onPress());
  const preview = view.root
    .findAllByProps({ accessibilityLabel: 'Preview refund' })
    .find(n => typeof n.props.onPress === 'function')!;
  expect(preview.props.disabled).toBe(true);
  expect(JSON.stringify(view.toJSON())).toContain('Available for refunds: ¥0');
});

test('sample journeys need no NFC and language choice survives remount', async () => {
  (demoLedger.list as jest.Mock).mockResolvedValue([]);
  const press = (label: string) =>
    view.root
      .findAllByProps({ accessibilityLabel: label })
      .find(n => typeof n.props.onPress === 'function')!
      .props.onPress();
  const history = () =>
    view.root
      .findAllByProps({ accessibilityLabel: 'Card history' })
      .find(n => typeof n.props.onPress === 'function')!
      .props.onPress();
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => press('Open menu'));
  await act(async () => press('Try sample card'));
  expect(readCard).not.toHaveBeenCalled();
  await act(async () => history());
  await act(async () => press('English station names'));
  expect(JSON.stringify(view.toJSON())).toContain('Shibuya');
  expect(JSON.stringify(view.toJSON())).toContain('Toranomon');
  await act(async () => view.unmount());
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => press('Open menu'));
  await act(async () => press('Try sample card'));
  await act(async () => history());
  expect(JSON.stringify(view.toJSON())).toContain('Shibuya');
  await act(async () => press('Japanese station names'));
  expect(JSON.stringify(view.toJSON())).toContain('渋谷');
});

test('scan failures close the sheet and use the original feedback handler', async () => {
  (readCard as jest.Mock).mockRejectedValueOnce(Error('Tag lost'));
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    await view.root
      .findAllByProps({ accessibilityLabel: 'Scan transit card' })
      .find(n => typeof n.props.onPress === 'function')!
      .props.onPress();
  });
  expect(showScanError).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'Tag lost' }),
  );
  expect(JSON.stringify(view.toJSON())).not.toContain('Ready to Scan');
});
