# grave

Bury dead bags, get sol back. Connect a Solana wallet (or peek at any address), see every dead coin as a tombstone, burn them and close their token accounts. Each closed account returns its rent (usually 0.00203928 sol) to your wallet.

## How it works

- **Scan:** `getTokenAccountsByOwner` for both the Token and Token-2022 programs, via `/api/rpc`.
- **Classify:** market facts per mint come from DexScreener via `/api/tokens`.
  - **dead:** no market, no trades in 24h, or under $50 liquidity. Ticked by default.
  - **empty:** zero balance, so it only needs closing. Ticked.
  - **dust:** still trading but worth under $1. Listed, unticked.
  - **alive:** worth $1 or more. Never buryable.
  - **kept out:** wrapped sol, usdc, usdt, NFTs and 0-decimal tokens, frozen accounts, accounts someone else can close, and accounts with withheld transfer fees.
  - If market data fails, only empty accounts can be closed.
- **Bury:** legacy transactions are built in the browser, each with up to 10 accounts and at most 1232 bytes. Each one contains:
  - compute budget,
  - `Burn` (if the account has a balance), then `CloseAccount` back to the owner,
  - an optional fee transfer.
- **Before signing:** every batch is simulated (`sigVerify: false`). A batch that fails is split, and accounts that fail on their own are skipped with the reason shown.
- **Signing:** through the Wallet Standard. `solana:signTransaction` signs every batch in one approval; otherwise the site falls back to `solana:signAndSendTransaction` once per batch.
- **Peek mode** is read-only. "Dry run" simulates the whole burial with that wallet as signer and sends nothing.

## Environment variables (Vercel)

| name | effect |
|---|---|
| `FEE_WALLET` | Turns on the 15% $GRAVE fee, paid to this address in each batch. It must be an existing, funded account. Unset means no fee. |
| `GRAVE_MINT` | Shows the $GRAVE contract address in the nav, click to copy. |
| `RPC_URL` | Your own Solana RPC, e.g. Helius. Defaults to the public mainnet endpoint, which rate-limits. |

## Files

- `index.html` is the whole page: markup, styles, the pixel engine (same code as `api/_pixel.js`), the transaction builder and the app, all inline and readable.
- `api/rpc.js` is a JSON-RPC proxy that only allows the read, simulate and send methods the page uses.
- `api/tokens.js` fetches DexScreener facts for up to 30 mints.
- `api/config.js` serves the public settings.
- `api/og.js` draws the share image: the same pixel engine as the page, encoded as a PNG with zlib.

Burning is permanent. Not financial advice.
