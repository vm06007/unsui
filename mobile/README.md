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

## Refund quotes, confirmation and demo ledger

After scanning a card with a positive **available demo balance**, tap **Preview
refund**. Enter a whole-yen amount from ¥1 up to that allowance, choose Sui,
Ethereum or Mizuhiki (Awaji Testnet), and enter a recipient address. Review the
amount, 2% demo fee, net conversion, recipient and estimated crypto payout.
**Edit quote** preserves inputs; switching networks clears the recipient.

**Re-scan & confirm demo refund** reads the newest balance block from the original
card. A different card or changed physical balance is rejected. Confirmation
can be cancelled and times out after 25 seconds. A cancelled or late scan cannot
create a receipt. While the receipt is being saved, navigation is held until the
write succeeds or fails. Failed saves can be retried with the same request ID;
even an ambiguous persisted write is recovered without a duplicate debit.

After a successful save, the receipt shows the yen amount, fee, crypto estimate,
recipient, network and remaining demo
balance. No funds are sent, no physical card balance changes and no transaction
hash is created. **Demo receipts** reopens backend receipts, including after app
restart. Card history remains the physical card's NFC records; it is separate
from the backend demo ledger.

The backend is the only refund ledger. It stores balances and receipts across app
restarts and devices. The phone retains only the backend URL, history language
and pending request references for safe retries; it never falls back to local
refund storage. Previous on-device receipts are not uploaded automatically.

The first demo refund establishes that card's allowance from its scanned balance.
Subsequent refunds share the remaining allowance across all networks. Re-scanning
or physically topping up the card does not replenish that initial allowance.
The backend serializes writes and validates quotes using the same rules as the
mobile app. Duplicate request IDs return the original receipt. Corrupt storage
blocks further refunds rather than clearing previous records. This development
service trusts the app's card readings and must not authorize real payouts.

Illustrative rates: 1 SUI = ¥10,000, 1 ETH = ¥500,000, 1 MIZU = ¥10,000.
The 2% fee is deducted before conversion, not charged separately. Estimates use
integer calculation at eight decimal places and round down. These are local
demo constants, not market data; network fees are not included.

Address checks cover hexadecimal shape, chain-specific length and the zero
address. They do not prove ownership, EVM checksum validity, account existence,
or network compatibility. Live market quotes, merchant charges and blockchain
payouts are not connected. Refunds above ¥1,000 require a server-verified
World ID proof; see [the backend README](../server/README.md).

## Recipient wallets and Sui names

Manual address entry is available on every network. On an Android dGen1 with
ethOS WalletProxy, connect the device wallet for Ethereum (chain 1) or Mizuhiki
Awaji Testnet (chain 6497). A network mismatch blocks review until the wallet
switches successfully, or you return to manual entry. Awaji must be supported by
the wallet; there is no fallback to another chain.

Signing the destination message is optional. It identifies the address, selected
network, time and unique request, and does not authorize a transaction or token
approval. Connection and signing can be cancelled and time out after two minutes.
The bridge checks the account and network before and after signing. Changing the
recipient or network clears the signature. Signed responses stay in memory and
are not server-verified ownership proofs; receipts store only the recipient
address. No private keys are accessed and no funds are sent.

The native bridge follows the public interface in
[EthereumPhone WalletSDK](https://github.com/EthereumPhone/WalletSDK/tree/e774281fb23170e4461f2676c4540e7de73aa992).
Rebuild the Android app to include it. Physical dGen1 testing is still required.
Other devices retain manual entry.

On Sui, enter a `.sui` name and resolve it through the
[Sui mainnet GraphQL service](https://sdk.mystenlabs.com/sui/clients/graphql).
Review the full address and tap **Use resolved address** before continuing.
**Use demo name** independently chooses `kartik.sui` or `vitally.sui` with equal
probability on each tap, then performs the same live lookup. Internet access is
required. Missing names, missing targets and service errors block that selection;
there is no hard-coded address fallback. A name lookup does not prove ownership.
Name and signing metadata are session-only; saved receipts retain the selected
address. Lookup cancellation and changes discard late results.

## Device demo and backend

Start the shared ledger in another terminal (after `npm ci` in `mobile`):

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
NFC. Sample refunds use a reserved sample ID, share their backend allowance, and
remain visibly labeled. Return **Home** or scan a physical card to leave the
sample flow. Physical-card confirmations still require a matching NFC re-scan.
There is no silent switch to sample data after an NFC failure.

History offers Japanese and English station/line names. The choice persists
across restarts. Known names are translated; unknown names keep their original
text. Menu/About describes the current demo scope. The original brand mark,
animated transit illustration, palette and rounded controls are shared with the
updated home screen. A modal scan sheet supports cancellation and Android Back.

## Standalone dGen1 build

Run `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` from
`android`, then install `app/build/outputs/apk/release/app-release.apk` with
`adb install -r`. This hackathon build uses the existing development signing key.
The release contains its own JavaScript bundle and works over Wi-Fi or mobile
data after unplugging USB. It does not require Metro.
