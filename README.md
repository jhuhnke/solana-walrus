# 🐘 Solana-Walrus SDK

A developer SDK for uploading, downloading, and managing files on [Walrus Storage](https://mystenlabs.com/projects/walrus) — designed specifically for Solana-native dApps.

Built using the [Mysten Labs Walrus SDK](https://sdk.mystenlabs.com/walrus) and [Wormhole](https://wormhole.com) for seamless Solana ↔ Sui bridging.

---

## ✨ Features

- 📤 Upload files to Walrus from a Solana wallet
- 📥 Download blobs using just a `blobId`
- 🗑️ Delete blobs (if marked `deletable`)
- 🏷️ Read custom attributes (like `contentType`)
- ⚙️ Auto-bridges SOL → WAL on Sui using Wormhole + Astros DEX
- 🔐 Automatically generates + caches a Sui keypair per Solana pubkey

---

## 📦 Installation

```bash
npm install solana-walrus
```

## Usage 

**1. Configure the SDK**
```ts 
import { WalrusSolanaSDK } from "solana-walrus";

const sdk = new WalrusSolanaSDK({
	network: "testnet",
	suiUrl: "https://fullnode.testnet.sui.io", // optional
	solanaRpcUrl: "https://api.testnet.solana.com", // optional
	tokenAddresses: {
		testnet: {
			wsSol: "0x2::sui::SUI",
			wal: "0xwalrus::WAL",
		},
		mainnet: {
			wsSol: "...",
			wal: "...",
		},
	},
});
```

**2. Upload a File**

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

**3. Download Blob Constants**

```ts
const bytes = await sdk.download(blobId);
const text = new TextDecoder().decode(bytes);
```

**4. Delete A Blob**

```ts
await sdk.delete(blobId, {
	publicKey: mySolanaWallet.publicKey,
});
```
Note: Only works if uploaded with ```deletable: true```

**5. Read Attributes**

```ts
const attrs = await sdk.getAttributes(blobId);
console.log(attrs); // { contentType: "text/plain", ... }
```