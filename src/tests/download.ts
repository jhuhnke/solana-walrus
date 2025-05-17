import { WalrusSolanaSDK } from "../sdk";
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

        // ✅ Use the provided blob ID
        const blobId = "0xdb03b1128d1fb9269c7c509824b4710dcd578441872a74c154d7863c41c3e38d";
        console.log(`[🔄] Downloading blob with ID: ${blobId}`);

        // ✅ Download blob
        const data = await sdk.download(blobId);
        console.log(`[✅] Blob data length: ${data.length}`);

        // ✅ Save the file locally for verification (optional)
        const filePath = path.join(__dirname, `${blobId}.bin`);
        fs.writeFileSync(filePath, data);
        console.log(`[✅] Blob saved to: ${filePath}`);

    } catch (error) {
        console.error("[❌] Failed to download blob:", error);
        process.exit(1);
    }
}

main().catch(console.error);
