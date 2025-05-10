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

## Setting Up a SUI Wallet for Walrus SDK

To interact with the Walrus SDK, you'll need a SUI wallet with some testnet SUI for gas. Here’s a quick setup guide using Phantom Wallet:

### **1. Importing an Existing SUI Wallet (Recommended)**
If you already have a SUI mnemonic, you can import it directly into Phantom:

1. **Install Phantom Wallet**  
   - Download and install the Phantom Wallet extension from [Phantom’s official site](https://phantom.app/).
   - Make sure you’re using the latest version with SUI support.

2. **Import SUI Mnemonic**  
   - Open Phantom.
   - Go to **Settings** → **Wallets** → **Import Wallet**.
   - Select **SUI** as the network.
   - Enter your existing SUI mnemonic.
   - Set a strong password and finish the setup.

---

### **2. Getting SUI for Gas**
Once your wallet is set up, you’ll need some testnet SUI to cover transaction fees:

1. **Switch to SUI Testnet**  
   - Open the Phantom Wallet.
   - Click on the network selector (top left corner) and select **SUI Testnet**.

2. **Request Testnet SUI**  
   - Visit the [SUI Testnet Faucet](https://discord.gg/sui) or use a public faucet like [SUI Foundation's Testnet Faucet](https://faucet.sui.io).  
   - Paste your SUI address and request some testnet SUI. You should see the funds arrive in a few seconds.

---

### **3. Checking Your Balance**
To ensure your wallet is ready for transactions:

- Check your SUI balance in the Phantom Wallet.
- Make sure you have enough gas to cover your first few transactions.

---

### **Next Steps**
With your SUI wallet ready, you can move on to integrating it with the Walrus SDK for seamless Solana-to-SUI interactions.

## Usage 

**1. Configure the SDK**
```ts 
import { WalrusSolanaSDK } from "solana-walrus";

const sdk = new WalrusSolanaSDK({
	network: "testnet",
	suiUrl: "https://fullnode.testnet.sui.io", // optional
	solanaRpcUrl: "https://api.devnet.solana.com", // optional
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

**LEARNINGS - To Integrate**
1. SUI Wallet cannot be fresh key - must be imported as mnemonic
2. Wormhole transfer requires that the sui wallet have a little gas. 
3. Solana must be on devnet 