import { WalrusSolanaSDK } from "../sdk/index";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Keypair, Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { configureSDK, getSDKConfig, getWalrusClient, getSuiClient } from "../config";
import fs from "fs";
import path from "path";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createSyncNativeInstruction } from "@solana/spl-token";

// ✅ Set up environment
process.env.SOLANA_RPC_HOST = "https://api.devnet.solana.com";

// ✅ Configure SDK before all tests (only once)
beforeAll(() => {
    try {
        console.log("[🛠️] Configuring SDK...");
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
        console.log("[✅] SDK Configured.");
    } catch (error) {
        console.error("[❌] Failed to configure SDK:", error);
        throw error;
    }
});

describe("WalrusSolanaSDK", () => {
    let sdk: WalrusSolanaSDK;
    let solanaWallet: Keypair;
    let suiKeypair: Ed25519Keypair;
    let connection: Connection;

    beforeAll(() => {
        try {
            console.log("[🔄] Initializing SDK...");
            sdk = new WalrusSolanaSDK(getSDKConfig());
            console.log("[✅] SDK Initialized.");

            // ✅ Load Solana Wallet
            const walletPath = path.join(__dirname, "test-wallet.json");
            if (!fs.existsSync(walletPath)) {
                throw new Error(`[❌] Wallet file not found at ${walletPath}`);
            }
            const secretKeyData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
            solanaWallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyData));
            console.log(`[✅] Solana wallet loaded. Address: ${solanaWallet.publicKey.toBase58()}`);

            // ✅ Load Sui Keypair
            const importPath = path.join(__dirname, "sui-wallet.json");
            if (!fs.existsSync(importPath)) {
                throw new Error(`[❌] Sui wallet file not found at ${importPath}`);
            }
            const importData = JSON.parse(fs.readFileSync(importPath, "utf8"));
            suiKeypair = Ed25519Keypair.deriveKeypair(importData.mnemonic);
            console.log(`[✅] Sui keypair loaded. Address: ${suiKeypair.getPublicKey().toSuiAddress()}`);

            // ✅ Set up Solana connection
            connection = new Connection(getSDKConfig().solanaRpcUrl!);
            console.log("[✅] Solana connection established.");
        } catch (error) {
            console.error("[❌] Failed to initialize SDK:", error);
            throw error;
        }
    });

    it("should upload a file to Walrus via Solana", async () => {
        try {
            // ✅ Check Solana Balance
            const balance = await connection.getBalance(solanaWallet.publicKey);
            console.log(`[✅] Solana balance: ${(balance / 1e9).toFixed(4)} SOL`);
            if (balance < 1e9) throw new Error("[❌] Insufficient SOL in test wallet. Fund the wallet and try again.");

            // ✅ Ensure wSOL is Funded
            const config = getSDKConfig();
            const wsSolMint = new PublicKey(config.tokenAddresses.testnet.wsSol);
            const wSolTokenAccount = await getAssociatedTokenAddress(wsSolMint, solanaWallet.publicKey, true);
            const balanceInfo = await connection.getTokenAccountBalance(wSolTokenAccount);
            const wSolBalance = balanceInfo.value.uiAmount || 0;
            console.log(`[✅] wSOL account balance: ${wSolBalance} wSOL`);

            if (wSolBalance === 0) {
                console.log('[💰] Wrapping 0.05 SOL into wSOL...');
                const wrapTx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: solanaWallet.publicKey,
                        toPubkey: wSolTokenAccount,
                        lamports: 50000000, // 0.05 SOL
                    }),
                    createSyncNativeInstruction(wSolTokenAccount)
                );

                const wrapSignature = await connection.sendTransaction(wrapTx, [solanaWallet]);
                console.log(`[✅] Wrapped 0.05 SOL into wSOL. TXID: ${wrapSignature}`);
                await connection.confirmTransaction(wrapSignature, 'confirmed');
            }

            // ✅ File Upload
            console.log("[📤] Uploading file...");
            const testFilePath = path.join(__dirname, "test.txt");
            if (!fs.existsSync(testFilePath)) throw new Error(`[❌] test.txt not found at ${testFilePath}`);
            
            console.log(`[📄] Using file path: ${testFilePath}`);

            const result = await sdk.upload({
                file: testFilePath,
                wallet: solanaWallet,
                suiKeypair,
                epochs: 3,
                deletable: true,
            });

            console.log(`[✅] Upload successful. Blob ID: ${result}`);
            expect(result).toBeDefined();
            console.log("[✅] Test passed.");

        } catch (error) {
            console.error("[❌] Test failed:", error);
            throw error;
        }
    }, 150_000); // 10 minute timeout for test (can be long due to testnet latency)
});
