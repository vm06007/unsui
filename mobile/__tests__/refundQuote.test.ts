import {
  amountError,
  createDemoQuote,
  recipientError,
  PayoutNetwork,
} from '../src/lib/refundQuote';
const sui = `0x${'1'.repeat(64)}`;
const evm = `0x${'a'.repeat(40)}`;

test.each([
  '',
  '0',
  '-1',
  '1.5',
  '1e3',
  'NaN',
  'Infinity',
  '1,000',
  '9007199254740993',
])('rejects invalid amount %s', value => {
  expect(amountError(value, 20000)).not.toBeNull();
});
test('accepts partial/full amounts within the scanned balance and rejects overdraws', () => {
  expect(amountError(' 245 ', 575)).toBeNull();
  expect(amountError('575', 575)).toBeNull();
  expect(amountError('576', 575)).not.toBeNull();
  expect(amountError('1', 0)).not.toBeNull();
  expect(amountError('1', NaN)).not.toBeNull();
});
test('requires full-length nonzero chain-specific addresses', () => {
  expect(recipientError(sui, 'sui')).toBeNull();
  expect(recipientError(evm, 'ethereum')).toBeNull();
  expect(recipientError(` ${evm} `, 'mizuhiki')).toBeNull();
  expect(recipientError(evm, 'sui')).not.toBeNull();
  expect(recipientError(sui, 'ethereum')).not.toBeNull();
  expect(recipientError(`0x${'0'.repeat(40)}`, 'ethereum')).not.toBeNull();
  expect(recipientError(`0x${'0'.repeat(64)}`, 'sui')).not.toBeNull();
  expect(recipientError('someone.eth', 'ethereum')).not.toBeNull();
  expect(recipientError(`0x${'g'.repeat(40)}`, 'mizuhiki')).not.toBeNull();
});
test.each<[PayoutNetwork, string, string]>([
  ['sui', sui, '0.05635'],
  ['ethereum', evm, '0.001127'],
  ['mizuhiki', evm, '0.05635'],
])(
  'calculates the fee and net payout for %s',
  (network, recipient, expected) => {
    const quote = createDemoQuote('575', 1000, network, ` ${recipient} `);
    expect(quote).toEqual({
      network,
      recipient,
      amountJpy: 575,
      feeJpy: 11.5,
      netJpy: 563.5,
      estimatedCrypto: expected,
    });
  },
);
test('handles smallest and maximum amounts without floating-point display artifacts', () => {
  expect(createDemoQuote('1', 20000, 'ethereum', evm).estimatedCrypto).toBe(
    '0.00000196',
  );
  expect(createDemoQuote('20000', 20000, 'sui', sui).estimatedCrypto).toBe(
    '1.96',
  );
  expect(() => createDemoQuote('20001', 20000, 'sui', sui)).toThrow();
  expect(() => createDemoQuote('575', 575, 'sui', evm)).toThrow();
});
