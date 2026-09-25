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
  (readCard as jest.Mock).mockResolvedValue({ idm: 'card', balanceJpy: 575 });
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
    resolve({ idm: 'card', balanceJpy: 575 });
  });
  expect(JSON.stringify(view.toJSON())).not.toContain('575');
  expect(JSON.stringify(view.toJSON())).toContain('Scan cancelled');
  expect(cancelScan).toHaveBeenCalled();
});
