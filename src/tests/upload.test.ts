process.env.SOLANA_RPC_HOST = "https://api.devnet.solana.com";

import { WalrusSolanaSDK } from "../sdk/index";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Keypair, Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { configureSDK, getSDKConfig } from "../config";
import fs from "fs";
import path from "path";
import bs58 from "bs58";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createSyncNativeInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

// ✅ Configure SDK before all tests
beforeAll(() => {
    console.log("[🛠️] Configuring SDK...");
    configureSDK({
        network: "testnet",
        suiUrl: "https://fullnode.testnet.sui.io",
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
            const secretKeyData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
            const secretKeyBytes = Uint8Array.from(secretKeyData);

            if (secretKeyBytes.length !== 64) {
                throw new Error(`[❌] Invalid Solana secret key size (${secretKeyBytes.length} bytes). Expected 64 bytes.`);
            }

            const solanaWallet = Keypair.fromSecretKey(secretKeyBytes);
            console.log(`[✅] Solana wallet loaded. Address: ${solanaWallet.publicKey.toBase58()}`);

            // ✅ 2. Load Sui keypair from mnemonic
            console.log("[🔑] Loading Sui keypair from import.json...");
            const importPath = path.join(__dirname, "./sui-wallet.json");
            if (!fs.existsSync(importPath)) {
                throw new Error(`[❌] import.json not found at ${importPath}`);
            }

            const importData = JSON.parse(fs.readFileSync(importPath, "utf8"));
            if (!importData.mnemonic) {
                throw new Error(`[❌] Invalid import.json file. 'mnemonic' field not found.`);
            }

            const suiKeypair = Ed25519Keypair.deriveKeypair(importData.mnemonic);
            console.log(`[✅] Sui keypair loaded. Address: ${suiKeypair.getPublicKey().toSuiAddress()}`);

            // ✅ 3. Verify Solana balance
            console.log("[💰] Checking Solana balance...");
            const connection = new Connection("https://api.devnet.solana.com");
            const balance = await connection.getBalance(solanaWallet.publicKey);
            console.log(`[✅] Solana balance: ${(balance / 1e9).toFixed(4)} SOL`);
            if (balance < 1e9) {
                throw new Error("Insufficient SOL in test wallet. Fund the wallet and try again.");
            }

            // ✅ 4. Ensure wSOL account is funded
            const config = getSDKConfig();
            const wsSolMint = new PublicKey(config.tokenAddresses.testnet.wsSol);
            const wSolTokenAccount = await getAssociatedTokenAddress(wsSolMint, solanaWallet.publicKey, true);

            console.log(`[🔄] Checking wSOL account: ${wSolTokenAccount.toBase58()}`);
            const balanceInfo = await connection.getTokenAccountBalance(wSolTokenAccount);
            const wSolBalance = balanceInfo.value.uiAmount || 0;

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
            } else {
                console.log(`[✅] wSOL account already funded with balance: ${wSolBalance}`);
            }

            // ✅ 5. File upload
            console.log("[📤] Uploading file...");
            const testFilePath = path.join(__dirname, "test.txt");
            const file = new File([fs.readFileSync(testFilePath)], "test.txt");
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