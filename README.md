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
		mainnet: {
			wsSol: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
			wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
		},
		testnet: {
			wsSol: "0xbc03aaab4c11eb84df8bf39fdc714fa5d5b65b16eb7d155e22c74a68c8d4e17f::coin::COIN",
			wal: "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
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