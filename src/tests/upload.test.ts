import { WalrusSolanaSDK } from "../sdk/index";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { configureSDK } from "../config";

// ✅ Configure SDK before all tests
beforeAll(() => {
    console.log("[🛠️] Configuring SDK...");
    configureSDK({
        network: "testnet",
        suiUrl: "https://fullnode.testnet.sui.io",
        tokenAddresses: {
            mainnet: {
                wsSol: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
                wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
            },
            testnet: {
                wsSol: "0xbc03aaab4c11eb84df8bf39fdc714fa5d5b65b16eb7d155e22c74a68c8d4e17f::coin::COIN",
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
            const sdk = new WalrusSolanaSDK({
                network: "testnet",
                suiUrl: "https://fullnode.testnet.sui.io",
                tokenAddresses: {
                    mainnet: {
                        wsSol: "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
                        wal: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
                    },
                    testnet: {
                        wsSol: "0xbc03aaab4c11eb84df8bf39fdc714fa5d5b65b16eb7d155e22c74a68c8d4e17f::coin::COIN",
                        wal: "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
                    },
                },
            });
            console.log("[✅] SDK Initialized.");

            // ✅ 1. Keypair generation
            console.log("[🔑] Generating keypairs...");
            const solanaWallet = Keypair.generate();
            const suiKeypair = Ed25519Keypair.generate();
            console.log(`[✅] Keypairs generated. Solana: ${solanaWallet.publicKey.toBase58()}, Sui: ${suiKeypair.getPublicKey().toSuiAddress()}`);

            // ✅ 2. Solana airdrop with retries
            console.log(`[💸] Airdropping 1 SOL to ${solanaWallet.publicKey.toBase58()}...`);
            const connection = new Connection("https://methodical-empty-forest.solana-testnet.quiknode.pro/357c49f3e52f3347f89f3408e368aaaac595c8b9/", 'confirmed');
            const airdropRetries = 2;
            let balance = 0;
            
            for (let attempt = 1; attempt <= airdropRetries; attempt++) {
                try {
                    await connection.requestAirdrop(solanaWallet.publicKey, 1e9);
                    //console.log(`[🚀] Airdrop tx (attempt ${attempt}): ${airdropSig}`);
                    // await connection.confirmTransaction(
                    //     {
                    //         signature: airdropSig,
                    //         blockhash: (await connection.getLatestBlockhash()).blockhash,
                    //         lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
                    //     },
                    //     "confirmed"
                    // );
                    balance = await connection.getBalance(solanaWallet.publicKey);
                    if (balance >= .1e9) {
                        console.log(`[✅] Airdrop confirmed. Balance: ${balance / 1e9} SOL`);
                        break;
                    }
                } catch (error) {
                    console.error(`[❌] Airdrop attempt ${attempt} failed:`, error);
                }

                if (attempt === airdropRetries) {
                    throw new Error(`[❌] Airdrop failed after ${airdropRetries} attempts.`);
                }

                console.log(`[🔄] Retrying airdrop in 5 seconds...`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }

            // ✅ 3. File upload
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
    }, 600_000); // 10 minute timeout for test (can be long due to testnet latency)
});
