# UnSui web

**[Live website](https://unsui.ca) · [Operations dashboard](https://unsui.ca/dashboard)**

## Explore the dashboard

Open [unsui.ca/dashboard](https://unsui.ca/dashboard) and choose **Try demo**.
The dashboard displays hosted app refund records, recipients, transaction links,
and reconciliation views. Customize Overview and Treasury & forecast cards,
filter and reorder table columns, or use the **Assistant** and its page-specific
prompts to change the same settings in plain language. Changes can be undone.

The assistant uses OpenRouter free models for display preferences; it does not
issue payouts or edit ledger records. Forecasts and sample merchant data remain
labeled separately from app receipts. See the [dashboard guide](../README.md#operations-dashboard-and-workspace-assistant)
for details.

## Browser wallet demo

Public site for the UnSui refund flow. It explains the product and includes a
browser demo of the wallet. The demo does not talk to the phone, the ledger
server, or the treasuries.

## Run

Requires Node >= 22.13.

```sh
npm install
npm run dev
```

Open http://localhost:3000. The interactive wallet is at http://localhost:3000/demo.

## What is here

- Landing page, ideology, and a how-it-works page for the refund path.
- A browser wallet: sample card, scanner, refund confirmation, and a local receipt.
- Sui is the default network. Ethereum is a preview choice only.
- Watch Demo opens the published ETHGlobal video in a modal with playback controls, audio, Escape/close handling, and a direct-video fallback. The Android download buttons serve the release APK.

Demo state lives in the browser and clears on reload. Receipt hashes use
`UNSUI_WEB_DEMO_V1`. They are not the Move contract's BCS receipts, and nothing
is submitted to a chain. Changing the amount is meant to fail the local proof.

## Check

```sh
npx tsc --noEmit
node scripts/check-demo.mjs
npm run build
```

## Image credit

Welcome Suica photograph: Ravi Dwivedi, CC BY-SA 4.0, used unchanged.
Source: https://commons.wikimedia.org/wiki/File:Welcome_Suica.jpg
License: https://creativecommons.org/licenses/by-sa/4.0/
The Cards view credits the photograph. Suica is a JR East brand. This prototype
is not affiliated with or endorsed by JR East.
