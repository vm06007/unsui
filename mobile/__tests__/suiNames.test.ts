import { BACKEND_URL } from '../src/config';
import { resolveSuiName } from '../src/lib/suiNames';
const address = `0x${'1'.repeat(64)}`;
const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();
beforeEach(() => {
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});
test('resolves through the mainnet query and normalizes input', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: { nameRecord: { domain: 'kartik.sui', target: { address } } },
    }),
  });
  await expect(resolveSuiName(' Kartik.SUI ')).resolves.toEqual({
    name: 'kartik.sui',
    address,
    network: 'mainnet',
  });
  expect(fetchMock.mock.calls[0][0]).toBe(`${BACKEND_URL}/sui/resolve-name`);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables.name).toBe(
    'kartik.sui',
  );
});
test('does not invent a destination for missing names or targets', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { nameRecord: null } }),
  });
  await expect(resolveSuiName('vitally.sui')).rejects.toThrow('not found');
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { nameRecord: { target: null } } }),
  });
  await expect(resolveSuiName('kartik.sui')).rejects.toThrow('no usable');
});
test('rejects query errors, malformed names and unavailable service', async () => {
  await expect(resolveSuiName('bad name.sui')).rejects.toThrow('valid');
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ errors: [{ message: 'bad query' }] }),
  });
  await expect(resolveSuiName('kartik.sui')).rejects.toThrow(
    'could not resolve',
  );
  fetchMock.mockResolvedValueOnce({ ok: false });
  await expect(resolveSuiName('kartik.sui')).rejects.toThrow('unavailable');
});
test('aborts a timed out lookup', async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener('abort', () =>
            reject(Error('aborted')),
          ),
        ),
    );
    const pending = resolveSuiName('kartik.sui');
    const assertion = async () => {
      await expect(pending).rejects.toThrow('timed out');
    };
    const checked = assertion();
    jest.advanceTimersByTime(10000);
    await checked;
  } finally {
    jest.useRealTimers();
  }
});
