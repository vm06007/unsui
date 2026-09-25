# UnSui mobile

React Native app for reading the balance of a physical Suica card over NFC.
The app works without a backend or account. It reads the newest balance record
without changing the card. Transaction history and refund flows are planned next.

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
