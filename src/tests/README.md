# 🧪 Walrus Test Suite

This folder contains test scripts for interacting with the [Walrus protocol](https://github.com/MystenLabs/walrus) on the SUI blockchain. Each script demonstrates a different aspect of the file lifecycle: quoting storage costs, uploading, reading, and deleting blobs.

All tests run against **SUI mainnet** and assume a valid `sui-wallet.json` is present in the root directory, containing a mnemonic for a funded wallet.

---

## 📂 Files

### `upload.ts`
- **Purpose:** Upload a file to Walrus storage using bridged WSOL → WAL.
- **Flow:**
  1. Reads and encodes a file (`test.txt`)
  2. Fetches a WAL cost quote via the Walrus API
  3. Calculates the equivalent WSOL amount to bridge from Solana
  4. Executes a Wormhole transfer to bring WSOL to SUI
  5. Swaps WSOL → WAL using the Aftermath aggregator
  6. Calls the Walrus `register_blob` function and writes the blob to Walrus nodes
- **Requires:** Active internet connection, working Wormhole + Aftermath setup, and WSOL on Solana Devnet.

---

### `delete.ts`
- **Purpose:** Deletes a previously uploaded blob on SUI and deregisters it from Walrus.
- **Flow:**
  1. Uses the blob ID to locate the registered blob object
  2. Submits a transaction to call `delete_blob` on the Walrus module
  3. Verifies deletion on-chain

---

### `storage-quote.ts`
- **Purpose:** Queries the current WAL price for storing a blob of a given size and duration.
- **Flow:**
  1. Connects to the Walrus on-chain quoting function
  2. Returns estimated cost in WAL for:
     - X bytes
     - Y epochs
     - Optionally: deletable vs. non-deletable blobs
- **Useful for:** Preflight quoting before bridging tokens or requesting approvals

---

### `read.ts`
- **Purpose:** Downloads and decodes a previously uploaded Walrus blob.
- **Flow:**
  1. Takes a blob ID
  2. Queries Walrus metadata from SUI
  3. Reads the blob from one or more Walrus nodes
  4. Decodes the file and writes it locally (optional)

---

## 🛠 Requirements

- Node.js 18+
- TypeScript
- Valid `.env` file or wallet JSON file at `./sui-wallet.json` with the following structure:

```json
{
  "mnemonic": "your 12-word mnemonic here"
}
```

`./solana-wallet.json` with the following structure: 

```json
[1, 1, 1, ... 1]
```