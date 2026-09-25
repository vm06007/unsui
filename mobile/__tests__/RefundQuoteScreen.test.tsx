import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RefundQuoteScreen from '../src/screens/RefundQuoteScreen';
let view: Renderer.ReactTestRenderer;
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
      <RefundQuoteScreen balanceJpy={575} onClose={onClose} />,
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
  await act(async () => button('Done, back to card').props.onPress());
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
