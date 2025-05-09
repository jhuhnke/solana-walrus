import { WalrusSolanaSDK } from "../sdk/index";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Keypair, Connection } from "@solana/web3.js";
import { configureSDK, getSDKConfig } from "../config";
import fs from "fs";
import path from "path";

// ✅ Configure SDK before all tests
beforeAll(() => {
    console.log("[🛠️] Configuring SDK...");
    configureSDK({
        network: "testnet",
        suiUrl: "https://fullnode.testnet.sui.io",
        tokenAddresses: {
            mainnet: {
                wsSol: "So11111111111111111111111111111111111111112",//"0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
                wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
            },
            testnet: {
                wsSol: "So11111111111111111111111111111111111111112",//"0xbc03aaab4c11eb84df8bf39fdc714fa5d5b65b16eb7d155e22c74a68c8d4e17f::coin::COIN",
                wal: "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
            },
        },
    });
    console.log("[✅] SDK Configured.");
});

describe("WalrusSolanaSDK", () => {
    it("should upload a file to Walrus via Solana", async () => {
        try {
            console.log("[🔄] Initializing SDK...");
            const sdk = new WalrusSolanaSDK(getSDKConfig());
            console.log("[✅] SDK Initialized.");

            // ✅ 1. Load pre-funded Solana wallet from JSON
            console.log("[🔑] Loading pre-funded Solana wallet...");
            const walletPath = path.join(__dirname, "test-wallet.json");
            const secretKeyBytes = JSON.parse(fs.readFileSync(walletPath, "utf8"));
            const solanaWallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
            console.log(`[✅] Solana wallet loaded. Address: ${solanaWallet.publicKey.toBase58()}`);

            // ✅ 2. Generate fresh Sui keypair
            const suiKeypair = Ed25519Keypair.generate();
            console.log(`[✅] Sui keypair generated. Address: ${suiKeypair.getPublicKey().toSuiAddress()}`);

            // ✅ 3. Verify Solana balance
            console.log("[💰] Checking Solana balance...");
            const connection = new Connection("https://api.testnet.solana.com");
            const balance = await connection.getBalance(solanaWallet.publicKey);
            console.log(`[✅] Solana balance: ${(balance / 1e9).toFixed(4)} SOL`);
            if (balance < 1e9) {
                throw new Error("Insufficient SOL in test wallet. Fund the wallet and try again.");
            }

            // ✅ 4. File upload
            console.log("[📤] Uploading file...");
            const file = new File(["hello world"], "test.txt");
            const result = await sdk.upload({
                file,
                wallet: solanaWallet,
                suiKeypair,
                epochs: 3,
                deletable: true,
            });
            console.log(`[✅] Upload successful. Blob ID: ${result}`);

            // ✅ Verify upload result
            expect(result).toBeDefined();
            console.log("[✅] Test passed.");
        } catch (error) {
            console.error("[❌] Test failed:", error);
            throw error;
        }
    }, 150_000); // 10 minute timeout for test (can be long due to testnet latency)
});
