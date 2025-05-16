import { WalrusSolanaSDK } from "../sdk";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function main() {
    try {
        console.log("[🛠️] Configuring SDK...");

        // ✅ Configure SDK (Initialize Clients)
        const sdk = new WalrusSolanaSDK({
            network: "testnet",
            suiUrl: "https://fullnode.testnet.sui.io:443",
            solanaRpcUrl: "https://api.devnet.solana.com",
            tokenAddresses: {
                mainnet: {
                    wsSol: "So11111111111111111111111111111111111111112",
                    wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
                },
                testnet: {
                    wsSol: "So11111111111111111111111111111111111111112",
                    wal: "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
                },
            },
        });

        // ✅ Resolve Paths (Avoid Double `src/tests`)
        const baseDir = path.resolve(__dirname);

        // ✅ Load Solana Wallet
        const solanaWalletPath = path.join(baseDir, "test-wallet.json");
        if (!fs.existsSync(solanaWalletPath)) {
            throw new Error(`[❌] Solana wallet file not found at ${solanaWalletPath}`);
        }
        const secretKeyData = JSON.parse(fs.readFileSync(solanaWalletPath, "utf8"));
        const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyData));
        console.log(`[✅] Solana wallet loaded. Address: ${solanaWallet.publicKey.toBase58()}`);

        // ✅ Load Sui Keypair (and use the same path for mnemonic)
        const mnemonicPath = path.join(baseDir, "sui-wallet.json");
        if (!fs.existsSync(mnemonicPath)) {
            throw new Error(`[❌] Sui wallet file not found at ${mnemonicPath}`);
        }
        const importData = JSON.parse(fs.readFileSync(mnemonicPath, "utf8"));
        const suiKeypair = Ed25519Keypair.deriveKeypair(importData.mnemonic);
        const suiAddress = suiKeypair.getPublicKey().toSuiAddress();
        console.log(`[✅] Sui keypair loaded. Address: ${suiAddress}`);

        // ✅ Read File for Upload
        const filePath = path.join(baseDir, "test.txt");
        if (!fs.existsSync(filePath)) {
            throw new Error(`[❌] File not found at ${filePath}`);
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileSize = fileBuffer.length;
        console.log(`[✅] File loaded. Size: ${fileSize} bytes`);

        // ✅ Extract epochs and deletable flag
        const epochs = parseInt(process.argv[2], 10) || 8;
        const deletable = process.argv.includes("--deletable");

        // ✅ Fetch and print storage quote
        console.log(`[💰] Fetching storage quote for ${fileSize} bytes over ${epochs} epochs...`);
        const quote = await sdk.storageQuote(fileSize, epochs);
        console.log(`[✅] Storage Quote:`, quote);

        // ✅ Upload File
        console.log(`[📤] Uploading ${filePath}...`);
        const suiPath = "/usr/local/bin/walrus";
        const blobId = await sdk.upload({
            file: filePath,
            wallet: solanaWallet,            // ✅ Pass the raw Keypair
            suiReceiverAddress: suiAddress, // ✅ Use the Sui address directly
            suiKeypair,
            epochs,
            deletable,
            mnemonicPath,
            suiPath,  // ✅ Pass the SUI binary path
        });

        console.log(`[✅] Upload successful. Blob ID: ${blobId}`);

    } catch (error) {
        console.error("[❌] Test failed:", error);
        console.error(error);
        process.exit(1);
    }
}

main().catch(console.error);
