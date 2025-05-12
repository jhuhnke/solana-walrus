import { getSuiClient, configureSDK, getSDKConfig, getWalrusClient } from "../config";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const SUI_TRANSACTION_COST = 0.015;

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

        const suiClient = getSuiClient();
        const walrusClient = getWalrusClient();
        console.log("[✅] Sui Client initialized via SDK:", suiClient);
        console.log("[✅] Walrus Client initialized via SDK:", walrusClient);

        // ✅ Load Solana Wallet
        const walletPath = path.join(__dirname, "test-wallet.json");
        if (!fs.existsSync(walletPath)) {
            throw new Error(`[❌] Wallet file not found at ${walletPath}`);
        }
        const secretKeyData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
        const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyData));
        console.log(`[✅] Solana wallet loaded. Address: ${solanaWallet.publicKey.toBase58()}`);

        // ✅ Load Sui Keypair
        const importPath = path.join(__dirname, "sui-wallet.json");
        if (!fs.existsSync(importPath)) {
            throw new Error(`[❌] Sui wallet file not found at ${importPath}`);
        }
        const importData = JSON.parse(fs.readFileSync(importPath, "utf8"));
        const suiKeypair = Ed25519Keypair.deriveKeypair(importData.mnemonic);
        const suiAddress = suiKeypair.getPublicKey().toSuiAddress();
        console.log(`[✅] Sui keypair loaded. Address: ${suiAddress}`);

        // ✅ Fetch WAL Balance
        const balanceResponse = await suiClient.getCoins({ owner: suiAddress });
        console.log(`[✅] Balance for ${suiAddress}:`, balanceResponse);

        // ✅ Check Solana Balance
        const connection = new Connection(getSDKConfig().solanaRpcUrl!);
        const solBalance = await connection.getBalance(solanaWallet.publicKey);
        console.log(`[✅] Solana balance: ${(solBalance / 1e9).toFixed(4)} SOL`);

        // ✅ Read File for Storage Quote
        const filePath = path.join(__dirname, "test.txt");
        if (!fs.existsSync(filePath)) {
            throw new Error(`[❌] File not found at ${filePath}`);
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileSize = fileBuffer.length;
        const epochs = 3;

        console.log(`[💰] Fetching storage quote for ${fileSize} bytes over ${epochs} epochs...`);
        const quote = await walrusClient.storageCost(fileSize, epochs);
        console.log(`[✅] Storage Quote:`, {
            walCost: Number(quote.storageCost) / 1e9,
            writeCost: Number(quote.writeCost) / 1e9,
            suiCost: SUI_TRANSACTION_COST,
            totalCost: (Number(quote.totalCost) / 1e9) + SUI_TRANSACTION_COST,
            encodedSize: fileSize,
            epochs,
        });

    } catch (error) {
        console.error("[❌] Test failed:", error);
        throw error;
    }
}

main().catch(console.error);
