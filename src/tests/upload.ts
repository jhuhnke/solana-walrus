import { WalrusSolanaSDK } from "../sdk";
import { getWebCryptoSigner } from "../wallets/deriveSuiKeypair"; 
import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function main() {
	try {
		console.log("[🛠️] Configuring SDK...");

		// ✅ Configure SDK
		const sdk = new WalrusSolanaSDK({
			network: "mainnet",
			suiUrl: "https://fullnode.mainnet.sui.io:443",
			solanaRpcUrl: "https://mainnet.helius-rpc.com/?api-key=2b68b687-9aaf-445a-847f-dd28e45cafef",
			tokenAddresses: {
				testnet: {
					wsSol: "So11111111111111111111111111111111111111112",
					wal: "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL",
				},
				mainnet: {
					wsSol: "So11111111111111111111111111111111111111112",
					wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
				},
			},
		});

		const baseDir = path.resolve(__dirname);

		// ✅ Load Solana Wallet
		const solanaWalletPath = path.join(baseDir, "test-wallet.json");
		if (!fs.existsSync(solanaWalletPath)) {
			throw new Error(`[❌] Solana wallet file not found at ${solanaWalletPath}`);
		}
		const secretKeyData = JSON.parse(fs.readFileSync(solanaWalletPath, "utf8"));
		const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyData));

		// ✅ Load WebCryptoSigner
		const { signer: suiSigner, addr: suiAddress } = await getWebCryptoSigner();
		console.log(`[✅] Sui signer loaded. Address: ${suiAddress}`);

		// ✅ Read File
		const filePath = path.join(baseDir, "test.txt");
		if (!fs.existsSync(filePath)) {
			throw new Error(`[❌] File not found at ${filePath}`);
		}
		const fileBuffer = fs.readFileSync(filePath);
		const fileSize = fileBuffer.length;

		const epochs = 1;
		const deletable = true;

		const quote = await sdk.storageQuote(fileSize, epochs);

		console.log(`[📤] Uploading ${filePath}...`);
		const blobId = await sdk.upload({
			file: filePath,
			wallet: solanaWallet,
			epochs,
			deletable,
		});

		console.log(`[✅] Upload successful. Blob ID: ${blobId}`);
	} catch (error) {
		console.error("[❌] Test failed:", error);
		process.exit(1);
	}
}

main().catch(console.error);
