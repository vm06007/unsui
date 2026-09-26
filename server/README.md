# UnSui development ledger

Shared refund records for the mobile app and dashboard integration. The service
persists receipts, tracks remaining allowances, prevents duplicate requests, and
verifies World ID proofs for refunds above ¥1,000. Sui mainnet payouts use the deployed treasury; merchant payments are not connected.

## Run

Requires Node 22.11+ and `npm ci` in `../mobile`. Run `npm ci` in this directory too.

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
expose it publicly. Mainnet mode is restricted to loopback and a trusted USB phone. Browser origins are
restricted to the existing local dashboard ports. Authentication, attestation
and production storage are a later backend step.

## API

- `GET /health`: protocol identity and `demo` or `sui-mainnet` mode.
- `GET /ledger`: versioned receipts for mobile balance/history. Contains card IDs
  and recipients; for the development client only.
- `POST /refunds`: confirmed card, quote and stable request ID. Revalidates the
  quote and remaining allowance. A repeated ID returns the original result;
  changing its quote is rejected. Data survives app and backend restarts.
- `GET /merchant-feed`: merchant-shaped Suica refund purchases for the local
  `unsui-extension`. Excludes card IDs and wallet addresses. Includes gross yen
  amount, 2% fee, net crypto estimate, chain, reference and demo designation.
  Confirmed receipts include the transaction hash. A `chrome-extension://` page
  may read this route only. There is no live processor connection.

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

## Sui mainnet payouts

Set `SUI_LIVE_PAYOUTS=true`, `SUI_BINARY` to the installed Sui CLI, and a stable,
random `CARD_COMMITMENT_SECRET` of at least 32 characters in the ignored `.env`.
The CLI signs with the existing operator keystore; no wallet private key belongs
in the mobile bundle. Select a separate `LEDGER_FILE` for live receipts, such as
`/absolute/path/to/unsui/server/data/live-ledger.json`. Back up both that file and
its `.orders` journal, along with the commitment secret. Never change the secret
for an existing treasury: it defines each card's on-chain identity.

Run one backend process. Live mode rejects sample cards and networks that are not enabled. Reset is disabled by default. Quotes and same-card readings are checked before authorization.
Requests are durably reserved before submission. An uncertain transaction result
must be retried with the same request; another request for that card is blocked.
Retries recover the immutable on-chain receipt and validate its hash, amount,
recipient and request before recording confirmation. No successful receipt is
shown from submission alone. On-chain card totals and request IDs also prevent
replays. The 0.05 SUI gas budget is a maximum, not a fixed charge.

The upgraded contract pays the exact backend-quoted MIST amount using CoinGecko
SUI/JPY after a 2% fee. Quotes expire after five minutes; legacy fixed-rate calls
are paused. The initial treasury deposit was 0.5 SUI; fund for current market rates. Funds are real;
card readings remain operator attestations, not evidence of a Suica debit.
`WORLD_ALLOW_TEST_BYPASS` is still a separate local test option and retains a
`bypassed` audit label; it does not constitute World ID verification.

## Ethereum mainnet payouts

Set `ETHEREUM_LIVE_PAYOUTS=true` with `ETHEREUM_RPC_URL`, the existing server-only `EVM_DEPLOYER_PRIVATE_KEY`, and `CARD_COMMITMENT_SECRET`. The key must match the deployed operator. Both Sui and Ethereum can be enabled together; unsupported networks fail closed. The service stays bound to loopback.

The adapter checks chain ID, operator, rate, fee, card allowance, treasury balance, and gas before signing. Signed transactions are journaled next to the ledger in `ethereum-transactions/` before broadcast. Keep this directory with the ledger: retries reuse the same transaction and verify the contract receipt and event after two confirmations. No automatic replacement or duplicate payout is issued after a timeout. A reverted transaction requires operator review. Maximum transaction gas cost is capped at 0.0001 ETH.

Mobile success and history show the transaction hash and Etherscan link. Local reset begins a new card-allowance round on both chains while retaining transaction journals; it remains explicitly opt-in.

## MultiBaas event feed

`GET /multibaas-feed` reads Awaji status, linked contract balance, and indexed refund events through the official SDK. Responses are cached for five seconds. Set `MULTIBAAS_DEPLOYMENT_URL`, `MULTIBAAS_API_KEY`, and, after deployment, `AWAJI_PAYOUT_CONTRACT`. Until a contract is linked, the endpoint reports `awaiting-contract` instead of inventing transactions. Cloud Wallets are optional; our deployment scripts sign locally.

Sui market quotes: `POST /quotes/sui` accepts `cardId`, `scannedBalanceJpy`, `amountJpy` and `recipient`. It fetches CoinGecko SUI/JPY with a 30-second cache, rejects prices older than three minutes, and signs a five-minute quote using the existing server-only card commitment secret. Optional `COINGECKO_API_KEY` supplies a CoinGecko Demo API key. The complete quote must accompany `/refunds`. A new request is checked for expiry and treasury funding before its payout reservation is saved. Confirmed on-chain retries remain recoverable after quote expiry.
