# UnSui development ledger

Shared refund records for the mobile app and dashboard integration. The service
persists receipts, tracks remaining allowances and prevents duplicate requests.
Merchant payments, World ID checks and blockchain payouts are not connected yet.

## Run

Requires Node 22.11+ and `npm ci` in `../mobile`. No separate server dependencies.

```sh
npm start
```

The build compiles the mobile app's pure ledger/quote modules using its installed
TypeScript compiler, so both execute identical amount, fee and recipient rules.
The service binds to `127.0.0.1:4100`. Run one process per ledger file.
`PORT` and `LEDGER_FILE` can override the defaults. The default file is
`server/data/ledger.json` (ignored by git). Writes use an fsynced temporary file
and atomic rename; requests are serialized. Back up this file to retain demo data.

Android USB: `adb reverse tcp:4100 tcp:4100`, then use `http://localhost:4100`
in Menu → Ledger connection. For an iPhone on the same trusted LAN, start with
`HOST=0.0.0.0 npm start`, use the computer's LAN IP in that menu, and allow the
OS's local-network permission. HTTP access depends on the native build's network
security settings; debug Android permits it. A hosted service should use HTTPS.

This is an unauthenticated development service, bound to loopback by default.
It accepts client-reported card readings, which are not proof of a debit. Do not
expose it publicly or fund payouts from these requests. Browser origins are
restricted to the existing local dashboard ports. Authentication, attestation
and production storage are a later backend step.

## API

- `GET /health`: protocol identity and demo mode.
- `GET /ledger`: versioned receipts for mobile balance/history. Contains card IDs
  and recipients; for the development client only.
- `POST /refunds`: confirmed card, quote and stable request ID. Revalidates the
  quote and remaining allowance. A repeated ID returns the original result;
  changing its quote is rejected. Data survives app and backend restarts.
- `GET /merchant-feed`: merchant-shaped demo purchases for dashboard integration.
  Excludes card IDs and wallet addresses. Includes gross yen purchase, 2% fee,
  net crypto estimate, chain, reference and demo designation. There is no live
  processor connection or transaction hash. Configure the dashboard to use this
  endpoint when its code is added; existing dashboard URLs are not changed here.

`ffffffffffffffff` is the sample card ID. Its shared ¥1,500 allowance is tracked
like other cards; reopening Demo does not replenish it. Real card data and sample
journeys are separate. The phone stores preferences and pending request IDs only.
A lost response can be retried without generating another debit. No local ledger
fallback exists.

## Verify

```sh
npm test
```

Tests cover persistence after restart, concurrent overspend prevention,
idempotency, quote tampering, wrong-card confirmation, corruption, and feed
privacy. They use separate temporary ledger files and ephemeral loopback ports.
