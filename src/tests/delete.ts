import { WalrusSolanaSDK } from "../sdk";
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
                    wal: "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL",
                },
            },
        });

        // ✅ Load Solana Wallet
        const baseDir = path.resolve(__dirname);
        const solanaWalletPath = path.join(baseDir, "test-wallet.json");
        if (!fs.existsSync(solanaWalletPath)) {
            throw new Error(`[❌] Solana wallet file not found at ${solanaWalletPath}`);
        }
        const secretKeyData = JSON.parse(fs.readFileSync(solanaWalletPath, "utf8"));
        const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyData));

        // ✅ Use the correct blob object ID
        //blobId = "HXIWioF1iNYisZLQhch6YKDYciQcP1HAI4R_M3nbvA"
        const blobObjectId = "0x7b9f51ab4655fb9d39e8dce51811baa5f1a282409ca8afb36ab2cee67b30236c";
        console.log(`[🗑️] Attempting to delete blob with ID: ${blobObjectId}`);

        // ✅ Attempt to delete the blob
        await sdk.delete(
            blobObjectId,
            "./test-wallet.json", // Solana wallet path
            "./sui-wallet.json" // Sui wallet path
        );
        console.log(`[✅] Blob successfully deleted: ${blobObjectId}`);

    } catch (error) {
        console.error("[❌] Failed to delete blob:", error);
        process.exit(1);
    }
}

main().catch(console.error);
