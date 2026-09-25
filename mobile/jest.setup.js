/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () => {
  const stores = new Map();
  return {
    createAsyncStorage: name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        getItem: jest.fn(async key => store.get(key) ?? null),
        setItem: jest.fn(async (key, value) => {
          store.set(key, value);
        }),
        removeItem: jest.fn(async key => {
          store.delete(key);
        }),
      };
    },
  };
});
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Path: View,
    Rect: View,
    Circle: View,
  };
});
