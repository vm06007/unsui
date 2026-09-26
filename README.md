# UnSui

UnSui connects a Japanese Suica card to a crypto refund workflow. Hold a
physical card to the phone to read the latest balance and recent journeys
without changing the card. A sample-card demo works when no card is nearby.
After a reading, choose a wallet and network, review the yen conversion, and
submit a refund request. A shared development ledger stores the receipt, tracks
the remaining allowance, and blocks duplicate requests.

Scanning works offline. Refunds need the local backend. Refunds above ¥1,000
require a server-verified World ID proof. Merchant charges, contract payouts,
and the dedicated dashboard are not connected yet.

## Project structure

- `mobile/` — React Native app with NFC scanning, a sample-card demo,
  English/Japanese journey history, dGen1 wallet connection, Sui name lookup,
  refund review, and the World ID handoff.
- `server/` — Shared refund ledger with persistent receipts, remaining-allowance
  tracking, retry protection, World ID verification, and a merchant feed for a
  future dashboard.

## Run on Android

Requires Node >= 22.11.

```sh
cd mobile
npm ci
```

Start the backend in another terminal:

```sh
cd server
npm start
```

From the repository root, point a USB-connected phone at the backend:

```sh
adb reverse tcp:4100 tcp:4100
cd mobile
npm start
```

In another terminal, from `mobile`, run `npm run android`. `BACKEND_URL` in
`mobile/src/config.ts` defaults to `http://localhost:4100` and is bundled with
the app.

Use **Menu → Demo**, or **No card nearby? Try the demo**, without a physical
card. Real card reading needs a physical NFC-F-capable Android phone with NFC
enabled. An Android emulator can show the layout, but it cannot read a card.

## Limits

Refunds are development records. No funds are sent, the physical card balance
does not change, and no transaction hash is created. The conversion rates and
2% demo fee are local constants, not market quotes.

See [mobile setup](mobile/README.md) and [backend setup and API](server/README.md).

## Sui mainnet deployment

- Package: [`0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541`](https://suivision.xyz/package/0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541)
- Treasury Ledger: [`0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535`](https://suivision.xyz/object/0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535)
- Publish transaction: [`CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW`](https://suivision.xyz/txblock/CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW)
- Deployment gas: **0.0275816 SUI**.
- Source-to-chain verification: **passed** using Sui CLI 1.80.0. Explorer-hosted source verification is not confirmed; SuiVision currently shows bytecode.
- Treasury funding and mobile payout integration: **not enabled**. The contract retains a fixed conversion policy; deployment does not turn it into live market pricing.

Full object IDs and reproducibility metadata: [deployment record](contracts/deployments/sui-mainnet.json).
