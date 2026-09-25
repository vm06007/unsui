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
for `BACKEND_URL` in `mobile/src/config.ts`. For an iPhone on the same trusted LAN, start with
`HOST=0.0.0.0 npm start`, set that variable to the computer's LAN origin before bundling, and allow the
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

## World ID

Refunds above ¥1,000 require a server-verified World ID proof, including sample-card requests. Up to ¥1,000 does not require a proof. This is a per-request threshold, not a daily limit.

Copy `.env.example` to `.env` and configure the RP signing key on the server only. `npm start` loads this file. For the USB-connected Android phone, localhost works with `adb reverse tcp:4100 tcp:4100` and `WORLD_ALLOW_LOCAL_HTTP=true`. Use an HTTPS origin for a hosted handoff. The local HTTP exception is disabled in production.

The default credential is Proof of Human. Set `WORLD_ID_CREDENTIAL=selfie` to select Selfie Check; restart to apply. The app opens the official IDKit browser flow, waits for verification, then requests the same-card confirmation when the app is foreground again. Cancellation, expiry, missing credentials and verification errors block recording the refund.

Proofs are bound to the card, recipient, amount, scanned balance, network and stable request reference. Approval is single-use; pending approvals expire after five minutes and are lost on restart. Recorded request retries retain their receipt without consuming another proof.

Development uses World staging verification. Automated provider responses are test fixtures; successful real credential verification still requires an end-to-end user test. The browser handoff and official SDK initialization have been checked on dGen1.

The verification page supports a QR code for another phone and a same-device link. After cancellation, completion, or expiry, **Return to UnSui** opens the mobile app. Android must include the `unsui://world/return` intent filter.

For local flow testing only, `WORLD_ALLOW_TEST_BYPASS=true` enables **Skip check for testing**. It is disabled by default and rejected when either Node or World ID uses production. Bypassed requests remain bound and single-use; receipts persist `humanCheck: bypassed`, never a verified claim. Disable this option when demonstrating actual World ID verification.
