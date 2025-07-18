# Solana-Walrus SDK

A developer SDK for uploading, downloading, and managing files on [Walrus Storage](https://mystenlabs.com/projects/walrus) — designed specifically for **Solana-native dApps**.

Built using the [Mysten Labs Walrus SDK](https://sdk.mystenlabs.com/walrus) and [Wormhole](https://wormhole.com) for seamless **Solana ↔ Sui bridging**.

---

## Features

- 📤 Upload files to Walrus from a Solana wallet  
- 📥 Download blobs using just a `blobId`  
- 🗑️ Delete blobs (if marked `deletable`)  
- 🏷️ Read custom attributes (like `contentType`)  
- 🔁 Auto-bridges SOL → WAL on SUI using Wormhole + Aftermath DEX  
- 🔐 Automatically generates + caches a SUI keypair per Solana pubkey  

---

## Installation

```bash
npm install solana-walrus
```

---

## Usage

### 1. Configure the SDK

```ts
import { WalrusSolanaSDK } from "solana-walrus";

const sdk = new WalrusSolanaSDK({
	network: "mainnet",
	suiUrl: "https://fullnode.mainnet.sui.io:443",
	solanaRpcUrl: "https://mainnet.helius-rpc.com/?api-key=yo_key",
	tokenAddresses: {
		mainnet: {
			wsSol: "So11111111111111111111111111111111111111112",
			WSOL: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
			wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
			coreBridge: "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c",
			tokenBridge: "0xc57508ee0d4595e5a8728974a4a93a787d38f339757230d441e895422c07aba9",
		},
		testnet: {
			wsSol: "So11111111111111111111111111111111111111112",
			WSOL: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
			wal: "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL",
			coreBridge: "0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790",
			tokenBridge: "0x6fb10cdb7aa299e9a4308752dadecb049ff55a892de92992a1edbd7912b3d6da"
		},
	},
});
```

### 2. Upload a File

```ts
const result = await sdk.upload({
  file: myFile,
  wallet: {
    publicKey: mySolanaWallet.publicKey,
    signTransaction: mySolanaWallet.signTransaction,
  },
  epochs: 3,
  deletable: true,
});
console.log("Uploaded Blob ID:", result);
```

### 3. Download a Blob

```ts
const bytes = await sdk.download(blobId);
const text = new TextDecoder().decode(bytes);
```

### 4. Delete a Blob

```ts
await sdk.delete(blobId, {
  publicKey: mySolanaWallet.publicKey,
});
```

> Only works if the blob was uploaded with `deletable: true`.

### 5. Read Attributes

```ts
const attrs = await sdk.getAttributes(blobId);
console.log(attrs); // { contentType: "text/plain", ... }
```

---

## Test Scripts

Located in the `tests/` folder:

| File              | Description                                                   |
|-------------------|---------------------------------------------------------------|
| `upload.ts`       | Uploads a file to Walrus and logs the resulting blob ID       |
| `read.ts`         | Downloads a blob and prints its contents                      |
| `delete.ts`       | Deletes a blob (must be deletable)                            |
| `storage-quote.ts`| Fetches WAL cost estimate for uploading a file                |

> ⚠️ Defaults to mainnet unless overridden.

---

## Developer Notes

### Testnet

- Swaps are unreliable; WAL is obtained via faucet
- SOL is bridged to SUI, and swap logic is bypassed

### Mainnet

- Uses Aftermath SDK to perform a swap from wSOL → WAL
- Protocol takes 2% of WAL cost before bridging

---

## Contributing

1. Create a new branch:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Open a pull request

3. Add a clear description of the changes in the PR

4. Tag `@jhuhnke` for review

---
