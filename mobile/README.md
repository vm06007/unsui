# UnSui mobile

React Native app for reading the balance of a physical Suica card over NFC.
NFC reading works without an account or backend. Refunds use the hosted backend at `https://unsui.ca/api/mobile`. The app reads the newest balance record
without changing the card. Switch between Card and History after a scan to see
up to 20 recent records. Preview a refund quote after scanning.

## Run

Requires Node >=22.11, npm and the React Native native toolchain.

```sh
npm ci
npm start
# In another terminal:
npm run android
```

Use a physical NFC-F-capable Android phone with NFC enabled. Tap **Scan transit
card** and hold one physical Suica card at the NFC antenna. You can cancel, retry,
or scan another card. A scan times out after 20 seconds. NFC support varies by
phone; simulators and emulators cannot validate card reading.

For iOS on macOS, install Xcode and CocoaPods, run `bundle install` and
`bundle exec pod install --project-directory=ios`, then `npm run ios`.
Configure your Apple development team and an NFC-enabled provisioning profile.
The project includes the TAG entitlement, usage description and FeliCa system
code `0003`. Physical iPhone testing is still required.

The Android debug keystore is the standard development key, not a release key.
The NFC dependency is pinned to `4.0.0-beta.9`, the library's new-architecture
line, for React Native 0.86.

## Check

```sh
npm run typecheck
npm test -- --runInBand --watchman=false
npm run lint
```

Tests cover packet validation, balance decoding, unavailable NFC and cancellation
of a pending scan. These checks do not replace a physical card/device test.

## Card history

History shows dates, activity labels, balances and available station names, newest
first. Amounts are differences between adjacent stored balances; the oldest record
has no known change. These are not guaranteed itemized fares or receipts. Station
names and activity labels are best-effort, with unknown values left unidentified.
Keep the card still until scanning finishes. If a later record cannot be read, the
app preserves the balance and available records with a partial-history notice.
Scanned data stays in memory and is cleared when scanning another card.

## Station dataset

The full station dataset is downloaded automatically when Metro starts or creates
an Android/iOS release JavaScript bundle. The source is pinned to revision
`e550c704890ba66149fcbb5f78ce15e66bc2ef60` of
[m2wasabi/nfcpy-suica-sample](https://github.com/m2wasabi/nfcpy-suica-sample), and
its SHA-256 is checked before use. Verified downloads are cached locally; builds
reuse that cache without another request. The app itself never fetches stations.

If a download fails or times out after eight seconds and no valid cache exists,
the build uses a bundled 22-entry Tokyo fallback: Ginza-line Shibuya, Toranomon,
Omotesando, Ginza, Ueno and Asakusa; selected JR entries for Tokyo, Shinagawa,
Shibuya, Shinjuku and Ikebukuro, plus entries for Akihabara, Shimbashi, Harajuku,
Ebisu and Roppongi. Codes are specific to a line, so this is not full
coverage of every line serving those stations. Other stations show as unknown;
dates and balances still work. A later build retries the full download.

Only `src/lib/stationCodes.fallback.json` belongs in git. Downloaded CSV files in
`.cache/stations/` and `src/generated/stationCodes.json` are ignored. `npm ci`,
tests and typechecking prepare the cached lookup or fallback without networking.
Run `npm run stations:prepare` to download explicitly, then restart Metro if it
was already running. Run `npm run test:stations` to check failure handling.

The lookup is keyed by line and station code, preferring region 0 for collisions.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the source license.

## Refund quotes, confirmation and shared ledger

The app uses `https://unsui.ca/api/mobile` for refunds. Scan a card, choose
Sui, Ethereum or Mizuhiki Awaji, and enter a recipient. Review the amount,
2% fee and payout before re-scanning the same card to confirm. A different card
or changed physical balance is rejected. The **Issuing refund** screen stays
visible while the backend submits and confirms the transaction.

Successful payouts show the amount, recipient, transaction hash and explorer
link. History includes the recorded refund alongside the scanned card history.
The physical card balance is not changed by the NFC scan; the shared ledger
tracks the remaining refund allowance across networks. Re-scanning or topping
up the physical card does not reset that allowance. Public ledger reset is disabled.

Receipts and pending transactions persist in Neon. The phone retains preferences
and pending request references so a failed or interrupted request can be retried
without issuing a duplicate payout. There is no local refund-storage fallback.

Sui uses a five-minute backend quote based on CoinGecko SUI/JPY. Ethereum uses
the deployed contract's configured rate. Awaji pays MJPY at 1 MJPY per net yen.
The 2% fee is deducted before conversion. Local sample mode has illustrative
rates and does not represent live treasury payouts; live mode rejects sample cards.

Refunds above ¥1,000 require a server-verified World ID proof. Address validation
and name resolution do not prove ownership. See [the backend README](../server/README.md)
for quote validation, persistence and network configuration.

On the refund review screen, tap the current network name to return to the card
with the network choices open. Choose Sui, Ethereum or Mizuhiki, then tap Refund
again to enter a recipient for that network and review a fresh quote. Network
changes remain locked while a confirmation or payout is in progress.

## Recipient wallets and Sui names

Manual address entry is available on every network. On an Android dGen1 with
ethOS WalletProxy, connect the device wallet for Ethereum (chain 1) or Mizuhiki
Awaji Testnet (chain 6497). A network mismatch blocks review until the wallet
switches successfully, or you return to manual entry. Awaji must be supported by
the wallet; there is no fallback to another chain.

Choosing **Use dGen1 wallet** requests a destination signature automatically. Manual
entry remains available without connecting a wallet. The message identifies the address, selected
network, time and unique request, and does not authorize a transaction or token
approval. Connection and signing can be cancelled and time out after two minutes.
The bridge checks the account and network before and after signing. Changing the
recipient or network clears the signature. Signed responses stay in memory and
are not server-verified ownership proofs; receipts store only the recipient
address. The connection/signature step does not send funds or expose private keys.

The native bridge follows the public interface in
[EthereumPhone WalletSDK](https://github.com/EthereumPhone/WalletSDK/tree/e774281fb23170e4461f2676c4540e7de73aa992).
Rebuild the Android app to include it. Test the wallet handoff on the target dGen1 build.
Other devices retain manual entry.

On Sui, enter a `.sui` name and resolve it through the
[Sui mainnet GraphQL service](https://sdk.mystenlabs.com/sui/clients/graphql).
The resolved address is selected automatically and shown for review.
**Use developer address** always prefills `kartik.sui`. Ethereum and Awaji also
support manual hexadecimal addresses or `.eth` names, resolved through Ethereum.
The input's resolve button checks a typed name. Internet access is
required. Missing names, missing targets and service errors block that selection;
there is no hard-coded address fallback. A name lookup does not prove ownership.
Name and signing metadata are session-only; saved receipts retain the selected
address. Lookup cancellation and changes discard late results.

## Local backend development and sample cards

The default app uses the hosted backend; USB forwarding is only needed when
working against a local server. To do that, start the shared ledger in another terminal (after `npm ci` in `mobile`):

```sh
cd ../server
npm start
```

It listens on `http://localhost:4100` and persists to `server/data/ledger.json`.
For Android over USB, run `adb reverse tcp:4100 tcp:4100`, then start Metro and
`npm run android` as above. Set `BACKEND_URL` in `src/config.ts` for your
backend before bundling the app. The URL cannot be changed in the app, and old
saved URL overrides are ignored. Refunds pause on connection failure;
card scanning and journey history remain available. **Refresh ledger** reloads
shared balances. See `../server/README.md` for LAN/iPhone setup and feed details.

**Menu → Demo** or **No card nearby? Try the demo** opens a fictional ¥1,500
sample card with three journey records. Confirmation is explicit and requires no
NFC. In local record-only mode, sample refunds use a reserved sample ID and share
their backend allowance. Hosted live payouts reject this sample card. Return **Home** or scan a physical card to leave the
sample flow. Physical-card confirmations still require a matching NFC re-scan.
There is no silent switch to sample data after an NFC failure.

History offers Japanese and English station/line names. The choice persists
across restarts. Known names are translated; unknown names keep their original
text. Menu/About describes the current demo scope. The original brand mark,
animated transit illustration, palette and rounded controls are shared with the
updated home screen. A modal scan sheet supports cancellation and Android Back.

## Standalone dGen1 build

Download the [Android ARM64 APK](https://unsui.ca/downloads/unsui-1.0-arm64.apk)
from **Get the app** on the website. It includes its JavaScript bundle and uses
the hosted API. Enable installation from your browser when Android requests it.
The downloadable hackathon build uses the development signing key.

Run `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` from
`android`, then install `app/build/outputs/apk/release/app-release.apk` with
`adb install -r`. This hackathon build uses the existing development signing key.
The release contains its own JavaScript bundle and works over Wi-Fi or mobile
data after unplugging USB. It does not require Metro.
