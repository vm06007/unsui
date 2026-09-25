# UnSui mobile

React Native app for reading the balance of a physical Suica card over NFC.
The app works without a backend or account. It reads the newest balance record
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
or scan another card. A scan times out after 25 seconds. NFC support varies by
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

## Refund quote preview

After scanning a card with a positive balance, tap **Preview refund**. Enter a
whole-yen amount from ¥1 up to the scanned balance, choose Sui, Ethereum or
Mizuhiki (Awaji Testnet), and enter a recipient address. **Review demo quote**
shows the amount, 2% demo service fee, net conversion amount, recipient and
estimated crypto payout. **Edit quote** preserves inputs; **Done** returns to
the card without changing its balance. Switching networks clears the recipient.

Illustrative rates: 1 SUI = ¥10,000, 1 ETH = ¥500,000, 1 MIZU = ¥10,000.
The fee is deducted before conversion, not charged separately. Estimates use
integer calculation at eight decimal places and round down. Rates and fees are
local demo constants, not current market data; network fees are not included.

Address checks cover hexadecimal shape, chain-specific length and the zero
address. They do not prove ownership, EVM checksum validity, account existence,
or network compatibility. This step creates no transaction, card debit, ledger
entry or backend request. Live quotes, payouts and human verification will be
separate integrations.
