# UnSui

**[Website](https://unsui.ca) · [Live operations dashboard](https://unsui.ca/dashboard)**

UnSui connects a Japanese Suica card to a crypto refund workflow. Hold a
physical card to the phone to read the latest balance and recent journeys
without changing the card. A sample-card demo works when no card is nearby.
After a reading, choose a wallet and network, review the yen conversion, and
submit a refund request. A shared hosted ledger stores the receipt, tracks
the remaining allowance, and blocks duplicate requests.

Scanning works offline. Refunds use the hosted backend at `unsui.ca`. Refunds above ¥1,000
require a server-verified World ID proof. Sui mainnet payouts are available through the hosted operator backend. The local
`unsui-extension` reads those refund receipts from `GET /merchant-feed` and projects them onto the SB Payment merchant page. It does not send data to SB Payment.

## Why World ID is part of the payout flow

UnSui integrates World ID to support a Japan-focused compliance and eligibility
workflow for crypto payouts. The aim is to check the person and the attributes
required for a particular service before releasing funds, while requesting only
the information that service needs.

The current integration verifies **Proof of Human** for refunds above ¥1,000 and
binds the approval to the card, recipient, amount and network. This establishes a
human-check step in the payout flow. The ¥1,000 trigger is our per-request product
rule, not a Japanese legal threshold.

World ID’s **Proof of Attributes** provides a path to more specific eligibility
checks. Users can add supported NFC-enabled passports or national IDs to World ID
and prove attributes such as age or nationality without handing UnSui a passport
copy. These credential features are described in [World’s credential guide](https://support.world.org/hc/en-us/articles/55499979675667-What-are-World-ID-Credentials-and-how-do-I-use-them-in-World-ID-app)
and [Proof of Attributes overview](https://world.org/world-id).

Potential extensions to UnSui include:

- **Passport-based eligibility:** request a supported nationality or age proof
  where an applicable service rule calls for it. A nationality condition could
  distinguish Japanese and non-Japanese nationals where lawful and appropriate;
  the current app does not enforce such a restriction.
- **Visitor or resident eligibility:** add evidence appropriate to the actual
  residency or visitor-status requirement. Nationality alone does not establish
  whether someone is a tourist or resident of Japan.
- **Required customer records:** where names or other identifying details must be
  recorded, add a dedicated customer-identification flow with appropriate notice,
  legal basis, access controls and retention. Proof of Human does not supply a
  name, and UnSui does not currently collect passport details or legal names
  through World ID.

These are extensions to the existing human check, not features already implemented
in UnSui. World ID is one component of the compliance design; applicable Japanese
registration, KYC and AML obligations still depend on the operating model and
must be met separately. The integration itself is not a certification of legal
compliance. See the [Japan FSA’s FinTech guidance](https://www.fsa.go.jp/en/news/2018/20180717.html)
and [crypto-service AML/CFT guidance](https://www.fsa.go.jp/inter/etc/20221207/01.pdf).

## Payout contracts and funding

Use these explorer links to check the current payout treasury balances and transactions.

| Network | Payout asset | Treasury / contract | Where to check funding |
| --- | --- | --- | --- |
| Sui mainnet | SUI | [`0xa4b33876…f94e535`](https://suivision.xyz/object/0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535) | Open the Ledger object's `pool` field. Its balance is in MIST: divide by 1,000,000,000 for SUI. |
| Ethereum mainnet | ETH | [`0xeAf3e03A…2319C52`](https://etherscan.io/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52) | Check the contract's ETH balance and transactions on Etherscan. |
| Mizuhiki Awaji testnet (6497) | MJPY | [`0xeAf3e03A…2319C52`](https://awaji.blockscout.com/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52) | Check MJPY under token holdings and token transfers on Blockscout. |

- **Sui Move package:** [`0xb4f9750ae4baf6cd1dd781f08b1d9a419c85fec62c13518b016434d8ea635ab8`](https://suivision.xyz/package/0xb4f9750ae4baf6cd1dd781f08b1d9a419c85fec62c13518b016434d8ea635ab8). Funds live in the Ledger above. Top up through `refunds::deposit`; a normal wallet transfer to the package or Ledger ID does not increase its payout pool.
- **Ethereum funding:** send ETH to the Ethereum contract above.
- **Awaji funding:** send **MJPY** to the Awaji contract above. MJPY token: [`0x78f5f0Ac4EF201618b97638ded959b155c4f4B04`](https://awaji.blockscout.com/address/0x78f5f0Ac4EF201618b97638ded959b155c4f4B04). MIZU pays operator gas, not refunds.
- Ethereum and Awaji share the same hexadecimal contract address on **different networks**. Select the correct network when funding.

Balances change with every refund; the explorer state is the current reference. Historical deposits are listed in the deployment sections below.

## Confirmed Sui refund

Receipt **GM-000003** paid **5.967690706 SUI** to `kartik.sui` on
**27 September 2026 at 03:51 JST**, for a **¥1,112** refund request with a
**¥22.24** fee.

[View the confirmed payout and recipient balance change on Suivision](https://suivision.xyz/txblock/7MnCfhtWLMi4yLvWzR7Td6uF4QNaCWEq5dp79a2VRYRQ?tab=Changes).
The recipient’s balance increased by **5,967,690,706 MIST**. For this contract
payout, Suivision’s Overview displays an amount of zero; the **Changes** tab shows
the SUI actually received. Find the corresponding receipt in the
[UnSui dashboard](https://unsui.ca/dashboard).

## Project structure

- `mobile/` — React Native app with NFC scanning, a sample-card demo,
  English/Japanese journey history, dGen1 wallet connection, Sui name lookup,
  refund review, and the World ID handoff.
- `server/` — Shared refund ledger with persistent receipts, remaining-allowance
  tracking, retry protection, World ID verification, and authenticated dashboard
  APIs with an assistant for display preferences.
- `web/` — Public site, browser wallet demo, and operations dashboard at
  `/dashboard`. The dashboard reads backend records; the separate wallet demo
  stays in the browser and does not call the phone, ledger, or treasuries.
- `extension/` — Chrome extension that projects a sample merchant dashboard.
  It can also read this repo's local merchant feed on port 4100.

## Operations dashboard and workspace assistant

Open **[unsui.ca/dashboard](https://unsui.ca/dashboard)** and choose **Try demo**
on the sign-in screen to explore the workspace. No local setup is needed.

The dashboard gives operators a shared view of service purchases,
crypto payouts, recipients, transaction hashes, and reconciliation. It brings app
ledger records, the SB merchant view, and MultiBaas-indexed Awaji payout evidence
into one workspace. Merchant records and blockchain evidence remain distinct:
an indexed payout does not establish that a merchant charge occurred.

Overview summarizes activity and payouts; Orders, Crypto payouts, and
Reconciliation provide detailed exploration. Treasury & forecast and Connections
provide liquidity planning and data-source context. Source labels distinguish
app records from sample merchant data; the overview's sandbox buffer is not a
live treasury balance.

### Quick dashboard tour

1. Open **Orders** or **Crypto payouts** to inspect app receipts, recipients, and transaction hashes.
2. Use **Customize cards** on Overview or Treasury & forecast to hide, reorder, and resize cards.
3. Open **Assistant** and try a page-specific suggestion to change the layout or visible columns, then use **Undo** to restore it.

The dashboard reads the hosted app ledger. Its **Try demo** entry opens the
operations workspace; the separate browser wallet demo at `/demo` uses local
sample data. Treasury forecast cards are planning views; use the contract
explorer links above to check actual funding.

### Make the dashboard yours

Use **Customize cards** on Overview to show or hide cards, drag them into order,
and choose small or wide cards. The popup stays open while changes appear on the
page. Start with All cards, Payout focus, or Reconciliation focus, then refine the
layout. Treasury & forecast has its own card controls for balance, commitments,
payouts, runway, forecast, assumptions, and settlement context. Its saved layout
is independent of Overview and can also be changed by the assistant. Preferences
save automatically in the current browser.

Tables have live filter and sort popups, draggable column ordering, column
visibility controls, and table, card, or timeline views. Layout preferences also
control text size, header and sidebar placement, compact navigation, content
width, descriptions, and card detail text.

### Describe the view you want

Open **Assistant** in the header and type a plain-language instruction or select
one of the examples suggested for the current page. The assistant changes the
same saved preferences as the manual controls, so the resulting layout updates
immediately. For example:

- “On Overview, show only Recorded payouts, Payout buffer, Payout asset mix and Latest journeys, in that order.”
- “Put recorded payouts and latest journeys first. Make latest journeys wide.”
- “Show only in-app SUI orders, largest purchase first.”
- “On Orders, move Recipient and Transaction hash to the first columns and show both.”

An **Undo** action restores the previous settings unless those settings have
since been changed again. The assistant customizes the workspace; it cannot
issue refunds, move funds, edit ledger records, or change authentication.
Input is currently text-based; microphone transcription is not implemented.

The backend uses OpenRouter's `openrouter/free` router with no paid-model
fallback. It validates an allowlisted `update_dashboard` tool call before the
browser applies it. Conversation text and display preferences go to OpenRouter;
ledger records and wallet keys are not automatically included. Free-model
availability and rate limits can affect response times.

### Run the dashboard

Start the backend as described below, then run `npm install` and `npm run dev`
inside `web/`. Open `/dashboard` on the URL printed by the dev server. Local
API requests are proxied to the backend on port 4100.

- Set `OPENROUTER_API_KEY` in the ignored `server/.env` to enable assistant requests.
- Set the public `VITE_THIRDWEB_CLIENT_ID` in `web/.env.local` to enable wallet login.
- Hosted deployments need authenticated backend routing as well as frontend
  environment configuration. Keep the OpenRouter key server-side; never expose it
  through a `VITE_*` variable.

Manual customization works without an AI key. See [assistant backend setup](server/README.md#dashboard-assistant),
[dashboard UI](web/app/dashboard/workspace), and the
[shared settings schema](shared/dashboard-settings.mjs) for implementation details.

### Deployment checks

Dashboard CI checks TypeScript, assistant validation/authentication tests, and a
Vercel production build. After deployment, run:

```sh
node web/scripts/check-production.mjs https://unsui.vercel.app
```

This checks API routes, JSON responses, rejected credentials, authenticated
sessions, and assistant configuration without requesting a payout or an AI
completion. The hosted operations route reads the Neon-backed app ledger through
the mobile API and returns an explicit unavailable response if that connection fails.

## Run on Android

Requires Node >= 22.11.

```sh
cd mobile
npm ci
```

For local backend development, start the server in another terminal:

```sh
cd server
npm start
```

For local backend development only, set `BACKEND_URL` to `http://localhost:4100` and forward the port:

```sh
adb reverse tcp:4100 tcp:4100
cd mobile
npm start
```

In another terminal, from `mobile`, run `npm run android`. `BACKEND_URL` in
`mobile/src/config.ts` defaults to `https://unsui.ca/api/mobile` and is bundled
with the app. A standalone Android release includes the JavaScript bundle and
uses Wi-Fi or mobile data, without Metro or USB port forwarding.

The hosted backend runs as a Vercel Node function with Neon Postgres for receipts,
World ID sessions, payout reservations and signed transaction journals. The
hackathon flow accepts public payout requests to valid Sui/EVM recipients,
including resolved names; wallet connection and device pairing are not required.
Repeated requests recover the saved transaction instead of signing a new payment.

Use **Menu → Demo**, or **No card nearby? Try the demo**, without a physical
card. Real card reading needs a physical NFC-F-capable Android phone with NFC
enabled. An Android emulator can show the layout, but it cannot read a card.

## Code to verify

Prize forms accept one link. These are the lines behind the World, Sui, and Curvegrid integrations.

### World ID

- Phone starts the check before a refund above ¥1,000 is confirmed: [`RefundQuoteScreen.tsx`](https://github.com/vm06007/unsui/blob/master/mobile/src/screens/RefundQuoteScreen.tsx#L126)
- Official IDKit Proof of Human request: [`server/world-ui/app.js`](https://github.com/vm06007/unsui/blob/master/server/world-ui/app.js#L28)
- Server posts the proof to World’s v4 verify API: [`server/world-id.cjs`](https://github.com/vm06007/unsui/blob/master/server/world-id.cjs#L59)

### Sui

- Mainnet gRPC client: [`server/sui/client.mjs`](https://github.com/vm06007/unsui/blob/master/server/sui/client.mjs#L31)
- Backend submits `unsui::refunds::refund_market`: [`server/sui/client.mjs`](https://github.com/vm06007/unsui/blob/master/server/sui/client.mjs#L109)
- Contract transfers SUI and freezes the receipt: [`unsui.move`](https://github.com/vm06007/unsui/blob/master/contracts/unsui/sources/unsui.move#L139)
- `.sui` names resolve through Sui mainnet GraphQL: [`server/server.cjs`](https://github.com/vm06007/unsui/blob/master/server/server.cjs#L80)

### Curvegrid MultiBaas

- SDK client, locked to the HTTPS MultiBaas host and Awaji chain id 6497: [`server/multibaas.mjs`](https://github.com/vm06007/unsui/blob/master/server/multibaas.mjs#L9)
- Indexed `Refunded` events for Mizuhiki payouts: [`server/multibaas.mjs`](https://github.com/vm06007/unsui/blob/master/server/multibaas.mjs#L70)
- Locally signed deployment bytes are submitted through the SDK: [`server/scripts/multibaas-awaji.mjs`](https://github.com/vm06007/unsui/blob/master/server/scripts/multibaas-awaji.mjs#L55)

## Sui mainnet deployment

- Active package (v2): [`0xb4f9750ae4baf6cd1dd781f08b1d9a419c85fec62c13518b016434d8ea635ab8`](https://suivision.xyz/package/0xb4f9750ae4baf6cd1dd781f08b1d9a419c85fec62c13518b016434d8ea635ab8)
- Original package/type origin: `0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541`
- Treasury Ledger: [`0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535`](https://suivision.xyz/object/0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535)
- Publish transaction: [`CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW`](https://suivision.xyz/txblock/CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW)
- Deployment gas: **0.0275816 SUI**.
- Source-to-chain verification: **passed** using Sui CLI 1.80.0. This verifies local source against deployed bytecode; an explorer-hosted verified-source badge is not confirmed.
- Initial treasury funding of **0.5 SUI**: [deposit transaction](https://suivision.xyz/txblock/B2PUHvty7AC7S7ga6yyDxpdLifqkuViNhNJHy7iK2zHx).
- Additional **8 SUI** treasury funding: [deposit transaction](https://suivision.xyz/txblock/ANBK4QDdN5VjyJMsksdwcp49HDsvPKEKzcVV2wadkYQH).
- Treasury replenishment on **27 September 2026**: **8 SUI** added through `refunds::deposit` ([confirmed deposit](https://suivision.xyz/txblock/F26wa9odkMrcJXXUPTQpnPqAuFR3yJsFdXdkLtrazRUk)). The pool held **8.175219528 SUI immediately after this deposit**; use the Ledger link above for its current balance.
- Mobile payout integration is enabled on the hosted backend via `SUI_LIVE_PAYOUTS=true`; live Sui payouts use CoinGecko market quotes.

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
- [Deployment transaction](https://awaji.blockscout.com/tx/0xe9db9ab93df06ce03958b7cf3bcddf69cc8fb56a6f831976fd80615553c11976), block **2390077**, deployed and linked through the official MultiBaas SDK. [Verified contract source](https://awaji.blockscout.com/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52?tab=contract).
- **MJPY token contract:** [`0x78f5f0Ac4EF201618b97638ded959b155c4f4B04`](https://awaji.blockscout.com/address/0x78f5f0Ac4EF201618b97638ded959b155c4f4B04).
- Gross parity: **¥1 = 1 MJPY**; after the 2% fee, **¥1,112 pays 1,089.76 MJPY**. These are testnet assets.
- Contract accepts prefunded ERC-20 payouts, not native MIZU payouts. Fund it with MJPY; keep MIZU in the operator wallet for gas.
- Backend persists signed transactions before submission through MultiBaas, waits for two confirmations, and verifies token-bound receipts. `/multibaas-feed` provides indexed events.
- [Deployment metadata](contracts/deployments/awaji-mjpy.json). Use the funding links above to check the current MJPY treasury balance.

### Sui market-rate payouts

Sui refunds use a CoinGecko SUI/JPY quote with a 2% service fee. The backend authenticates a five-minute quote bound to the card, observed balance, recipient and exact MIST amount. Move trusts the authorized operator's quote, enforces expiry and replay protection, and records the exact payout. This is backend pricing, not an on-chain price oracle. Stale/unavailable prices fail closed.

- [Upgraded Move package](https://suivision.xyz/package/0xb4f9750ae4baf6cd1dd781f08b1d9a419c85fec62c13518b016434d8ea635ab8)
- [Upgrade transaction](https://suivision.xyz/txblock/DGsF4hDFBkfHrLirHrc9d7L4frxGbsXaKWchwRYFfULr)
- [Market policy](https://suivision.xyz/object/0xa0b187430f713383cb6b5b112024732aa3c4cbef962c0402e73bb34ad95d0a42)
- [Existing treasury and refund history](https://suivision.xyz/object/0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535) are preserved.

The legacy Ledger pause flag stays **true** to block old fixed-rate calls. Market payouts use the separate MarketPolicy pause flag; administer it with `pause_market`. Keep the legacy pause flag true. Quote amounts are capped at 200 SUI per refund. Fund the treasury for market prices before testing: the previous fixed rate is no longer used for live Sui refunds. Old receipts retain their original amounts.

### Website presentation mode

Select **Present the project** on the homepage for an eight-slide introduction: the problem, a standalone video meme with looping audio, experience, payout architecture, dashboard, confirmed transaction and demo handoff. Use Left/Right arrows or the slide dots to navigate, the fullscreen control when supported, and Escape to close. The final slide links directly to the browser demo, dashboard and Android APK. A separate **How it works — detailed slides** link opens nine architecture slides covering the five-step refund flow, quote, treasury cycle, sandbox money cycle, interactive buffer model, receipt commitments, merchant references, operations and explorer evidence. A persistent **Back to main slides** control returns to the original deck. The merchant and workspace slides include SB and UnSui dashboard screenshots. Click either screenshot or **Enlarge screenshot** to open a full-screen viewer. Close it with the close button or Escape to return to the same slide.

### Merchant identity and API reference

Merchant and order references connect purchase records with payout tracking and reconciliation in the dashboard. SB Payment identifies the merchant with `merchant_id`, the contracted service with `service_id`, and the purchase with `order_id`.

See the official [SB Payment developer documentation](https://developer.sbpayment.jp/) and [purchase request specification: merchant, service and order IDs](https://developer.sbpayment.jp/system-specifications/link-type/2517/).

### Hackathon refund rounds

In the Android app, tap the **UnSui logo on the home screen three times quickly**
to start a new refund round when the hosted backend has
`ALLOW_HOSTED_HACKATHON_RESET=true`. Scan the card again to refund it in the new
round. This permits another real payout from the funded treasury.

The app shows the current round; earlier receipts remain in the dashboard.
Transaction journals and payout reservations are retained, old request IDs cannot
issue a second payment, and a pending payout must be resolved before a round can
change. The gesture requires the updated APK; a backend deployment alone cannot
unlock it in an older release build. The hosted flag defaults to disabled.
