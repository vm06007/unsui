# UnSui mobile

React Native app for Android and iOS with an UnSui welcome screen. NFC scanning,
balances, wallets, payouts and World ID will follow separately.

## Run

Requires Node >=22.11, npm and the React Native native toolchain.

```sh
npm ci
npm start
# In another terminal:
npm run android
```

For iOS on macOS, install Xcode and CocoaPods, run `bundle install` and
`bundle exec pod install --project-directory=ios`, then `npm run ios`.
The Android debug keystore is the standard development key, not a release key.

## Check

```sh
npm run typecheck
npm test -- --runInBand --watchman=false
npm run lint
```
