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
Ethereum mainnet payouts are enabled with `ETHEREUM_LIVE_PAYOUTS=true`; Awaji MJPY payouts are enabled with `AWAJI_LIVE_PAYOUTS=true` and require MJPY treasury funding.

See [mobile setup](mobile/README.md) and [backend setup and API](server/README.md).

## Code to verify

Prize forms accept one link. These are the lines behind the World, Sui, and Curvegrid integrations.

### World ID

- Phone starts the check before a refund above ¥1,000 is confirmed: [`RefundQuoteScreen.tsx`](https://github.com/vm06007/unsui/blob/master/mobile/src/screens/RefundQuoteScreen.tsx#L126)
- Official IDKit Proof of Human request: [`server/world-ui/app.js`](https://github.com/vm06007/unsui/blob/master/server/world-ui/app.js#L28)
- Server posts the proof to World’s v4 verify API: [`server/world-id.cjs`](https://github.com/vm06007/unsui/blob/master/server/world-id.cjs#L59)

### Sui

- Mainnet gRPC client: [`server/sui/client.mjs`](https://github.com/vm06007/unsui/blob/master/server/sui/client.mjs#L31)
- Backend submits `unsui::refunds::refund`: [`server/sui/client.mjs`](https://github.com/vm06007/unsui/blob/master/server/sui/client.mjs#L109)
- Contract transfers SUI and freezes the receipt: [`unsui.move`](https://github.com/vm06007/unsui/blob/master/contracts/unsui/sources/unsui.move#L139)
- `.sui` names resolve through Sui mainnet GraphQL: [`server/server.cjs`](https://github.com/vm06007/unsui/blob/master/server/server.cjs#L80)

### Curvegrid MultiBaas

- SDK client, locked to the HTTPS MultiBaas host and Awaji chain id 6497: [`server/multibaas.mjs`](https://github.com/vm06007/unsui/blob/master/server/multibaas.mjs#L9)
- Indexed `Refunded` events for Mizuhiki payouts: [`server/multibaas.mjs`](https://github.com/vm06007/unsui/blob/master/server/multibaas.mjs#L70)
- Locally signed deployment bytes are submitted through the SDK: [`server/scripts/multibaas-awaji.mjs`](https://github.com/vm06007/unsui/blob/master/server/scripts/multibaas-awaji.mjs#L55)

## Sui mainnet deployment

- Package: [`0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541`](https://suivision.xyz/package/0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541)
- Treasury Ledger: [`0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535`](https://suivision.xyz/object/0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535)
- Publish transaction: [`CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW`](https://suivision.xyz/txblock/CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW)
- Deployment gas: **0.0275816 SUI**.
- Source-to-chain verification: **passed** using Sui CLI 1.80.0. Explorer-hosted source verification is not confirmed; SuiVision currently shows bytecode.
- Treasury funded with **0.5 SUI**: [deposit transaction](https://suivision.xyz/txblock/B2PUHvty7AC7S7ga6yyDxpdLifqkuViNhNJHy7iK2zHx).
- Mobile payout integration is enabled locally via `SUI_LIVE_PAYOUTS=true`; the contract retains a fixed conversion policy.

Full object IDs and reproducibility metadata: [deployment record](contracts/deployments/sui-mainnet.json).


## Ethereum mainnet deployment

- Contract: [`0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52`](https://etherscan.io/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52)
- [Deployment transaction](https://etherscan.io/tx/0x4039868bb4d6cc091b9beb959d822975a5dec9b443b0fc0c7c8bcb98506d72e7), block 26059748.
- Gas cost: 0.0000607496525559 ETH. Compiled runtime bytecode and constructor settings checked on chain.
- Fixed gross rate: 2,000,000,000,000 wei/JPY, less 2% fee.
- Treasury funded with **0.0045 ETH**: [deposit transaction](https://etherscan.io/tx/0xbf256d5fa7b5d109ad2f4aefa3a31e7587549dd77044ecb5efdd2d4537ca86f0). Ethereum mobile payouts use the backend operator, wait for two confirmations, and link receipts to Etherscan.
- Source verified on [Etherscan](https://etherscan.io/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52#code): matching bytecode and ABI (September 26, 2026).
- Source verified on [Sourcify](https://repo.sourcify.dev/1/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52): **exact match**, creation and runtime bytecode (September 26, 2026).
- [Deployment metadata](contracts/deployments/ethereum-mainnet.json). Awaji MJPY deployment is recorded below.

## Mizuhiki Awaji MJPY payouts

- Chain: **Awaji testnet (6497)**. Gas: **MIZU**. Payout token: **MJPY**, 6 decimals.
- Treasury: [`0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52`](https://awaji.blockscout.com/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52). This is the same hexadecimal address as Ethereum, on a different chain with different contract code.
- [Deployment transaction](https://awaji.blockscout.com/tx/0xe9db9ab93df06ce03958b7cf3bcddf69cc8fb56a6f831976fd80615553c11976), deployed and linked through the official MultiBaas SDK; source verified on Blockscout.
- Token: [`0x78f5f0Ac4EF201618b97638ded959b155c4f4B04`](https://awaji.blockscout.com/address/0x78f5f0Ac4EF201618b97638ded959b155c4f4B04).
- Gross parity: **¥1 = 1 MJPY**; after the 2% fee, **¥1,112 pays 1,089.76 MJPY**. These are testnet assets.
- Contract accepts prefunded ERC-20 payouts, not native MIZU payouts. Fund it with MJPY; keep MIZU in the operator wallet for gas.
- Backend persists signed transactions before submission through MultiBaas, waits for two confirmations, and verifies token-bound receipts. `/multibaas-feed` provides indexed events.
- [Deployment metadata](contracts/deployments/awaji-mjpy.json). Treasury currently awaits MJPY funding.
