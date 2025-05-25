# 🐘 Solana-Walrus SDK

A developer SDK for uploading, downloading, and managing files on [Walrus Storage](https://mystenlabs.com/projects/walrus) — designed specifically for **Solana-native dApps**.

Built using the [Mysten Labs Walrus SDK](https://sdk.mystenlabs.com/walrus) and [Wormhole](https://wormhole.com) for seamless **Solana ↔ Sui bridging**.

---

## ✨ Features

- 📤 Upload files to Walrus from a Solana wallet  
- 📥 Download blobs using just a `blobId`  
- 🗑️ Delete blobs (if marked `deletable`)  
- 🏷️ Read custom attributes (like `contentType`)  
- 🔁 Auto-bridges SOL → WAL on SUI using Wormhole + Aftermath DEX  
- 🔐 Automatically generates + caches a SUI keypair per Solana pubkey  

---

## 📦 Installation

```bash
npm install solana-walrus
```

---

## 🛠 Usage

### 1. Configure the SDK

```ts
import { WalrusSolanaSDK } from "solana-walrus";

const sdk = new WalrusSolanaSDK({
  network: "mainnet", // or "testnet"
  suiUrl: "https://fullnode.mainnet.sui.io",
  solanaRpcUrl: "https://api.mainnet-beta.solana.com",
  tokenAddresses: {
    mainnet: {
      wsSol: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
      wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
    },
    testnet: {
      wsSol: "0xbc03aaab4c11eb84df8bf39fdc714fa5d5b65b16eb7d155e22c74a68c8d4e17f::coin::COIN",
      wal: "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL",
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

## 🧪 Test Scripts

Located in the `tests/` folder:

| File              | Description                                                   |
|-------------------|---------------------------------------------------------------|
| `upload.ts`       | Uploads a file to Walrus and logs the resulting blob ID       |
| `read.ts`         | Downloads a blob and prints its contents                      |
| `delete.ts`       | Deletes a blob (must be deletable)                            |
| `storage-quote.ts`| Fetches WAL cost estimate for uploading a file                |

> ⚠️ Defaults to mainnet unless overridden.

---

## 🪙 SUI Wallet Setup

### 1. Import via Mnemonic

1. Install [Phantom Wallet](https://phantom.app)
2. Open Phantom → Settings → Wallets → Import Wallet
3. Select **SUI**, paste your mnemonic

### 2. Fund Wallet with SUI

- For **testnet**, use [https://faucet.sui.io](https://faucet.sui.io)
- For **mainnet**, bridge or use exchange

---

## 🧠 Developer Notes

### Testnet

- Swaps are unreliable; WAL is obtained via faucet
- SOL is bridged to SUI, and swap logic is bypassed

### Mainnet

- Uses Aftermath SDK to perform a swap from wSOL → WAL
- Protocol takes 2% of WAL cost before bridging

---

## 🧑‍💻 Contributing

1. Create a new branch:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Open a pull request

3. Add a clear description of the changes in the PR

4. Tag `@jhuhnke` for review

---
