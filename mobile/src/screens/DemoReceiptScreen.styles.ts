import { StyleSheet } from 'react-native';
export const styles = StyleSheet.create({
  check: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#CBEE9F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  checkText: { fontSize: 40, color: '#173E35' },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#68776F',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    letterSpacing: -1,
    color: '#172D29',
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  amount: {
    fontSize: 40,
    letterSpacing: -1,
    color: '#173E35',
    fontWeight: '600',
    marginBottom: 18,
  },

  hero: { alignItems: 'center', paddingTop: 12 },
  payoutNote: { fontSize: 12, color: '#68776F', textAlign: 'center' },
  reference: { backgroundColor: '#E8EDE2', borderRadius: 16, padding: 16 },
  receiptLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: '#52695B',
    marginBottom: 8,
  },
  digest: {
    fontSize: 12,
    lineHeight: 18,
    color: '#173E35',
    fontFamily: 'monospace',
  },

  root: { flex: 1 },

  content: { gap: 22, paddingVertical: 28 },
  badge: { fontSize: 12, color: '#385131', fontWeight: '700' },

  note: { fontSize: 14, lineHeight: 22, color: '#687667' },
  label: { fontSize: 17, lineHeight: 25, color: '#214A37', fontWeight: '600' },

  panel: { gap: 18, padding: 20, borderRadius: 18, backgroundColor: '#E9EFDD' },
  row: { gap: 4 },
  button: {
    padding: 18,
    backgroundColor: '#214A37',
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
