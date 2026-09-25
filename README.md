# UnSui

UnSui connects Japanese transit-card balances with crypto refund workflows.
Read your Suica balance and journeys, choose a wallet and network, review the
conversion, and track your refund request through a shared ledger.

## Project structure

- `mobile/` — React Native app with NFC scanning, sample-card demo, EN/JP history,
  dGen1 wallet connection, Sui names, refund review and backend receipts.
- `server/` — Shared refund ledger with persistent receipts, balance tracking,
  retry protection and a merchant feed for dashboard integration.

## Run on Android

```sh
cd mobile
npm ci
```

Start the backend in one terminal:

```sh
cd server
npm start
```

From the repository root, connect the phone over USB:

```sh
adb reverse tcp:4100 tcp:4100
cd mobile
npm start
```

In another terminal, run `npm run android` from `mobile`. Use **Menu → Demo**
without a physical card. **Menu → Ledger connection** defaults to
`http://localhost:4100`. All refunds require that backend; scanning works offline.
Use a physical NFC-F-capable device to test real card reading.

See [mobile setup](mobile/README.md) and [backend setup/API](server/README.md).
World ID, contract payouts and the dedicated dashboard are future steps. The
merchant feed is ready for the dashboard to consume when it is added.
