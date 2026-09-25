import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';
import { readCard, cancelScan } from '../src/lib/suica';
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/lib/suica', () => ({
  readCard: jest.fn(),
  cancelScan: jest.fn().mockResolvedValue(undefined),
}));
let view: ReactTestRenderer.ReactTestRenderer;
afterEach(async () => {
  await act(async () => view?.unmount());
  jest.clearAllMocks();
});
test('scan shows the actual balance and allows another scan', async () => {
  (readCard as jest.Mock).mockResolvedValue({
    idm: 'card',
    balanceJpy: 575,
    history: [],
    historyLimited: false,
  });
  await act(async () => {
    view = ReactTestRenderer.create(<App />);
  });
  await act(async () => {
    await view.root
      .findAllByProps({ accessibilityRole: 'button' })[0]
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
      .findAllByProps({ accessibilityRole: 'button' })[0]
      .props.onPress();
  });
  await act(async () => {
    view.root
      .findAllByProps({ accessibilityRole: 'button' })[0]
      .props.onPress();
  });
  await act(async () => {
    resolve({
      idm: 'card',
      balanceJpy: 575,
      history: [],
      historyLimited: false,
    });
  });
  expect(JSON.stringify(view.toJSON())).not.toContain('575');
  expect(JSON.stringify(view.toJSON())).toContain('Scan cancelled');
  expect(cancelScan).toHaveBeenCalled();
});

test('history tab shows records and a partial-read notice without another scan', async () => {
  (readCard as jest.Mock).mockResolvedValue({
    idm: 'card',
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
      .findAllByProps({ accessibilityRole: 'button' })[0]
      .props.onPress();
  });
  await act(async () => {
    view.root
      .findAllByProps({ accessibilityRole: 'tab' })
      .filter(node => typeof node.props.onPress === 'function')[1]
      .props.onPress();
  });
  const output = JSON.stringify(view.toJSON());
  expect(output).toContain('Shibuya');
  expect(output).toContain('Toranomon');
  expect(output).toContain('Only part of the history');
  expect(readCard).toHaveBeenCalledTimes(1);
});
