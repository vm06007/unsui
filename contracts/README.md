# UnSui payout contracts

- `unsui/`: Sui Move treasury for native SUI payouts.
- `evm/`: Solidity treasury deployed on Ethereum mainnet; Awaji deployment pending.

## Sui accounting

The operator submits a 32-byte keyed card commitment, unique request commitment, recipient, gross yen amount, observed balance, expected sequence and five-minute expiry. The treasury transfers SUI and creates an immutable receipt atomically. Admin capability holders can pause payouts and rotate the operator. Anyone can deposit SUI. Request IDs prevent replay; card sequences reject stale requests.

The Sui package uses receipt domain `UNSUI_RECEIPT_V2` and pays `gross JPY × 100,000 MIST × 98 / 100`, matching the mobile application's 2% fee. Fractional yen fees are retained in the conversion calculation. The conversion rate is a fixed test policy, not a live exchange rate. The earlier V1 receipt verifier must be updated before integration.

The EVM contract uses `UNSUI_EVM_RECEIPT_V2` and deducts a 2% fee from its immutable gross `weiPerJpy` rate. Ethereum uses 2,000,000,000,000 wei/JPY; Awaji uses 100,000,000,000,000 atomic MIZU/JPY to match mobile quotes. Neither is a market price feed.

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
- Sui treasury funded with 0.5 SUI and enabled locally; see the root README for the deposit transaction. The contract retains a fixed conversion policy.

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


## EVM deployment preparation

Ethereum mainnet deployment is recorded in `deployments/ethereum-mainnet.json`. Awaji awaits test MIZU funding. Do not label
the Ethereum or Awaji mobile options live until their backend adapters are connected.
Build with `forge build --root contracts/evm`. Run all contract tests before publishing.

Awaji uses the official MultiBaas SDK. Configure the `AWAJI_*` public addresses,
server-only signer and gas budget in `server/.env`. From `server`, run
`npm run multibaas:awaji -- status`, then `prepare`, `broadcast`, and `finalize`.
The SDK composes the deployment, submits locally signed bytes, and links the
contract for event indexing after checking its successful receipt. Journals and
signed transactions live in ignored `server/data/`; resume them on retries.

Ethereum mainnet uses the same compiled contract with constructor arguments
`admin`, `operator`, and gross rate `2000000000000`. Select the signer and check
chain ID 1, deployment gas and funding before broadcasting. Record both contract
addresses and deployment hashes here after confirmation, then verify the exact
source, optimizer settings and constructor arguments on their explorers.


## Verified Ethereum mainnet contract

- Address: [`0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52`](https://etherscan.io/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52)
- [Verified source on Sourcify](https://repo.sourcify.dev/1/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52): exact creation and runtime bytecode matches.
- Compiler: Solidity 0.8.30; EVM target Cancun; optimizer enabled, 200 runs.
- Constructor: admin and operator `0x20025F78da2b65D2b1cfa7FC411e1dA3F56f3BB3`; gross rate `2000000000000` wei/JPY.
- [Deployment and verification metadata](deployments/ethereum-mainnet.json).

Source verification is confirmed on [Etherscan](https://etherscan.io/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52#code) (matching bytecode and ABI) and Sourcify (exact creation and runtime matches).

Ethereum treasury initial funding: **0.0045 ETH**, confirmed in [this deposit transaction](https://etherscan.io/tx/0xbf256d5fa7b5d109ad2f4aefa3a31e7587549dd77044ecb5efdd2d4537ca86f0). The mobile Ethereum payout adapter is not yet enabled.
