import { WalrusSolanaSDK, configureSDK } from "../sdk";
import fs from "fs";
import path from "path";

async function main() {
    try {
        console.log("[🛠️] Configuring SDK...");

        // ✅ Configure SDK
        configureSDK({
            network: "testnet",
            suiUrl: "https://fullnode.testnet.sui.io:443",
            solanaRpcUrl: "https://api.devnet.solana.com",
            tokenAddresses: {
                mainnet: {
                    wsSol: "So11111111111111111111111111111111111111112",
                    wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
                    coreBridge: "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c", 
                    tokenBridge: "0xc57508ee0d4595e5a8728974a4a93a787d38f339757230d441e895422c07aba9",
                },
                testnet: {
                    wsSol: "So11111111111111111111111111111111111111112",
                    wal: "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL",
                    coreBridge: "0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790", 
                    tokenBridge: "0x6fb10cdb7aa299e9a4308752dadecb049ff55a892de92992a1edbd7912b3d6da",
                },
            },
        });

        // ✅ Initialize the SDK
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

        // ✅ Read File for Storage Quote
        const filePath = path.join(__dirname, "test.txt");
        if (!fs.existsSync(filePath)) {
            throw new Error(`[❌] File not found at ${filePath}`);
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileSize = fileBuffer.length;

        // ✅ Get epochs from CLI argument (default to 8)
        const epochs = parseInt(process.argv[2], 10) || 8;

        // ✅ Fetch Storage Quote
        console.log(`[💰] Fetching storage quote for ${fileSize} bytes over ${epochs} epochs...`);
        const quote = await sdk.storageQuote(fileSize, epochs);
        console.log(`[✅] Storage Quote in SOL:`, quote);

    } catch (error) {
        console.error("[❌] Test failed:", error);
        throw error;
    }
}

main().catch(console.error);
