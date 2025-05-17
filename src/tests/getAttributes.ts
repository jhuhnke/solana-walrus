import { WalrusSolanaSDK } from "../sdk";

async function main() {
    try {
        console.log("[🛠️] Configuring SDK...");

        // Configure SDK (Initialize Clients)
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

        // Use the provided blob ID
        const blobObjectId = "0xd91a48e88584a8dba0b5a8ed1a7ca42865972f752ef4b27435adee130f3a0e1b";

        console.log(`[🔎] Fetching attributes for blob ID: ${blobObjectId}`);

        // Fetch attributes
        const attributes = await sdk.getAttributes(blobObjectId);
        console.log("[✅] Blob attributes:", attributes);

    } catch (error) {
        console.error("[❌] Failed to fetch blob attributes:", error);
        process.exit(1);
    }
}

main().catch(console.error);
