# UnSui payout contracts

- `unsui/`: Sui Move treasury for native SUI payouts.
- `evm/`: Solidity treasury for Ethereum-compatible networks; not deployed from this repository.

## Sui accounting

The operator submits a 32-byte keyed card commitment, unique request commitment, recipient, gross yen amount, observed balance, expected sequence and five-minute expiry. The treasury transfers SUI and creates an immutable receipt atomically. Admin capability holders can pause payouts and rotate the operator. Anyone can deposit SUI. Request IDs prevent replay; card sequences reject stale requests.

The Sui package uses receipt domain `UNSUI_RECEIPT_V2` and pays `gross JPY × 100,000 MIST × 98 / 100`, matching the mobile application's 2% fee. Fractional yen fees are retained in the conversion calculation. The conversion rate is a fixed test policy, not a live exchange rate. The earlier V1 receipt verifier must be updated before integration.

The EVM contract retains its original fee-free rate policy. Do not activate it against the mobile quotes before aligning that accounting.

## Validation

```sh
sui move test --path contracts/unsui
forge test --offline --root contracts/evm
```

## Sui mainnet deployment

- Package: [`0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541`](https://suivision.xyz/package/0xbf654bef3c0177dfd909fe00bd133bba716efa47b6150dfbd7a5792484527541)
- Treasury Ledger: [`0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535`](https://suivision.xyz/object/0xa4b33876663619dd90862ab611e104258f9c366ba1c6655dfb0a4a93af94e535)
- Publish transaction: [`CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW`](https://suivision.xyz/txblock/CpZLzLBuHDrRnbQMb67L2EyKDsAM7P1gNAUevsr39dwW)
- Deployment gas: **0.0275816 SUI**.
- Source-to-chain verification: **passed** using Sui CLI 1.80.0. Explorer-hosted source verification is not confirmed; SuiVision currently shows bytecode.
- Treasury funding and mobile payout integration: **not enabled**. The contract retains a fixed conversion policy; deployment does not turn it into live market pricing.

Full object IDs and reproducibility metadata: [deployment record](deployments/sui-mainnet.json).

### Source verification

Run `sui client --client.env mainnet verify-source contracts/unsui` against the published package using its publication metadata. Preserve the exact source and `Move.lock` used to publish. CLI bytecode verification and explorer-hosted source verification are separate steps: only label the explorer source verified after its service accepts and displays it.

Transaction details, transfers, events, and created receipt objects can be inspected in an explorer independently of source-code verification. For mainnet, use `https://suivision.xyz/txblock/<digest>` for transactions and `https://suivision.xyz/package/<packageId>` for the package. Use the matching network explorer for every link.

## Deployment

Use a local Sui keystore; never commit private keys or keystores. Mainnet has been selected explicitly. Publish with `sui client --client.env mainnet publish contracts/unsui --json`, then record the successful transaction digest, package ID, shared Ledger ID, AdminCap ID and UpgradeCap ID. Do not assume old devnet deployment IDs apply to this package.

Treasury funding is a separate transaction and amount decision. Keep SUI for publisher/operator gas. This version has no treasury withdrawal function; only deposit funds intended for payouts.

## Integration boundaries

Publishing does not activate mobile payouts. The backend must persist order reservations, submit using a server-held operator, reconcile unknown transaction outcomes, and verify the confirmed receipt before marking a payout complete. It must verify the merchant purchase independently of card scan data. World ID checks and the development bypass do not establish payment validity.

The contracts do not authenticate NFC data, debit transit cards or enforce cross-chain limits. Card accounting tracks cumulative redeemed yen against an operator-attested balance; arbitrary top-ups or decreasing balances require a separate purchase accounting model. Never publish raw card identifiers or unkeyed hashes of them. Use stable keyed commitments.
