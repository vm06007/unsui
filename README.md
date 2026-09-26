# UnSui

UnSui connects a Japanese Suica card to a crypto refund workflow. Hold a
physical card to the phone to read the latest balance and recent journeys
without changing the card. A sample-card demo works when no card is nearby.
After a reading, choose a wallet and network, review the yen conversion, and
submit a refund request. A shared development ledger stores the receipt, tracks
the remaining allowance, and blocks duplicate requests.

Scanning works offline. Refunds need the local backend. Refunds above ¥1,000
require a server-verified World ID proof. Sui mainnet payouts are available through the local operator backend. Merchant
charges and the dedicated dashboard are not connected yet.

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

In Sui mainnet mode, a confirmed refund sends real SUI from the prefunded
treasury and includes its transaction hash and explorer link. NFC scanning does
not debit the physical card or prove a merchant charge. The conversion is fixed
at 0.0001 SUI per yen, less a 2% fee (¥1,100 pays 0.1078 SUI), not market pricing.
The operator backend is for a trusted USB-connected device and binds to loopback.
Ethereum and Mizuhiki payouts are not enabled.

See [mobile setup](mobile/README.md) and [backend setup and API](server/README.md).

## Sui mainnet deployment

- Package: [`0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541`](https://suivision.xyz/package/0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541)
- Treasury Ledger: [`0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535`](https://suivision.xyz/object/0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535)
- Publish transaction: [`CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW`](https://suivision.xyz/txblock/CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW)
- Deployment gas: **0.0275816 SUI**.
- Source-to-chain verification: **passed** using Sui CLI 1.80.0. Explorer-hosted source verification is not confirmed; SuiVision currently shows bytecode.
- Treasury funded with **0.5 SUI**: [deposit transaction](https://suivision.xyz/txblock/B2PUHvty7AC7S7ga6yyDxpdLifqkuViNhNJHy7iK2zHx).
- Mobile payout integration is enabled locally via `SUI_LIVE_PAYOUTS=true`; the contract retains a fixed conversion policy.

Full object IDs and reproducibility metadata: [deployment record](contracts/deployments/sui-mainnet.json).
