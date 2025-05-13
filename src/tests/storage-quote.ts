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
                },
                testnet: {
                    wsSol: "So11111111111111111111111111111111111111112",
                    wal: "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
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
                    wal: "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
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
