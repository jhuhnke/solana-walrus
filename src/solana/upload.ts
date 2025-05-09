import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { VersionedTransaction, Connection, Keypair, Transaction } from "@solana/web3.js";
import { UploadOptions } from "../types";
import { getSDKConfig } from "../config";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";
import { finalizeUploadOnSui } from "../walrus/upload";
import { getCachedOrCreateSuiKeypair } from "../wallets/deriveSuiKeypair";

// 🔧 Use your custom RPC for faster blockhash lookups
const CUSTOM_RPC_URL = "https://methodical-empty-forest.solana-testnet.quiknode.pro/357c49f3e52f3347f89f3408e368aaaac595c8b9/";

// 🔄 Get a connection to your custom RPC
function getCustomConnection(): Connection {
    return new Connection(CUSTOM_RPC_URL);
}

export async function uploadFile(options: UploadOptions): Promise<string> {
    const {
        file,
        wallet,
        suiReceiverAddress,
        suiKeypair: userProvidedSuiKeypair,
        epochs,
        deletable,
        connection,
    } = options;

    const config = getSDKConfig();

    // ✅ 0. Enforce correct wallet type
    if (!(wallet instanceof Keypair)) {
        throw new Error("[Walrus SDK] Expected a Solana Keypair for the payer.");
    }

    // ✅ 1. Use or generate Sui keypair
    const suiKeypair = userProvidedSuiKeypair || getCachedOrCreateSuiKeypair(wallet.publicKey);

    // ✅ 2. Select Solana RPC
    const solanaConnection = connection || getCustomConnection();

    // ✅ 3. Get file size + hash
    const fileSize = file.size;
    const fileHash = await hashFile(file);
    const fileBytes = new Uint8Array(await file.arrayBuffer());

    // ✅ 4. Get quote from Walrus
    const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });
    const estimatedSOL = quote.totalCost;

    // ✅ 5. Get token info and Sui address
    const { wsSol, wal } = config.tokenAddresses[config.network];
    const suiReceiver = suiReceiverAddress || suiKeypair.getPublicKey().toSuiAddress();

    // ✅ 6. Check Astros gas sponsorship
    const gasFree = await isAstrosGasFreeSwapAvailable(
        wsSol,
        wal,
        (estimatedSOL * 1e9).toFixed(0),
        suiReceiver
    );

    // ✅ 7. Apply protocol fee
    const protocolFeePercent = gasFree ? 0.01 : 0.02;
    const totalSOL = estimatedSOL * (1 + protocolFeePercent);

    // ✅ 8. Transfer protocol fee to treasury
    const { remainingSOL } = await transferProtocolFee({
        connection: solanaConnection,
        payer: wallet,
        amountSOL: totalSOL,
    });

    // ✅ 9. Send Wormhole message from Solana → Sui
    await createAndSendWormholeMsg({
        fileHash,
        fileSize,
        amountSOL: remainingSOL,
        wallet: {
            publicKey: wallet.publicKey,
            signTransaction: async (
                tx: Transaction | Uint8Array | VersionedTransaction | { transaction: { transaction: Transaction; signers: Keypair[] } }
            ) => {
                try {
                    console.log(`[📝] Attempting to sign transaction...`);
            
                    // ✅ Log full details of the incoming transaction
                    console.log(`[🔍] Raw Transaction Type:`, Object.getPrototypeOf(tx)?.constructor?.name);
                    console.log(`[🔍] Transaction Object Keys:`, Object.keys(tx || {}));
            
                    // ✅ Handle SolanaUnsignedTransaction
                    if (typeof tx === "object" && tx !== null) {
                        const proto = Object.getPrototypeOf(tx);
                        const constructorName = proto?.constructor?.name;
                        
                        // 🧐 Detect SolanaUnsignedTransaction
                        if (constructorName === "SolanaUnsignedTransaction") {
                            console.log(`[📝] Detected SolanaUnsignedTransaction, inspecting structure...`);
            
                            // Log a deep inspection of the transaction object
                            console.dir(tx, { depth: null });
            
                            // Attempt to unwrap
                            if ("transaction" in tx && "signers" in tx) {
                                const nestedTx = (tx as { transaction: { transaction: Transaction, signers: Keypair[] } }).transaction.transaction;
                                const signers = (tx as { transaction: { transaction: Transaction, signers: Keypair[] } }).transaction.signers;
            
                                console.log(`[🔍] Extracted inner transaction:`, nestedTx);
                                console.log(`[🔍] Extracted signers:`, signers);
            
                                // Ensure it's a real Transaction instance
                                if (nestedTx instanceof Transaction) {
                                    console.log(`[✅] Unwrapped inner transaction is a valid Transaction.`);
            
                                    // ✅ Fetch a fresh blockhash **just before signing**
                                    const connection = new Connection("https://methodical-empty-forest.solana-testnet.quiknode.pro/357c49f3e52f3347f89f3408e368aaaac595c8b9/");
                                    const latestBlockhash = await connection.getLatestBlockhash();
                                    nestedTx.recentBlockhash = latestBlockhash.blockhash;
                                    console.log(`[✅] Set fresh blockhash: ${latestBlockhash.blockhash}`);
            
                                    // ✅ Sign the transaction
                                    nestedTx.partialSign(wallet, ...signers);
                                    console.log(`[✅] Successfully signed unwrapped transaction.`);
            
                                    const serializedTx = nestedTx.serialize();
                                    console.log(`[✅] Serialized transaction length: ${serializedTx.length} bytes`);
                                    return serializedTx;
                                } else {
                                    console.error(`[❌] Unsupported inner transaction type:`, nestedTx);
                                    throw new Error(`[❌] Unsupported inner transaction type for signing.`);
                                }
                            } else {
                                console.error(`[❌] SolanaUnsignedTransaction is missing expected structure:`, tx);
                                throw new Error(`[❌] Malformed SolanaUnsignedTransaction, missing transaction or signers.`);
                            }
                        }
                    }
            
                    // ✅ Handle raw Uint8Array transactions
                    if (tx instanceof Uint8Array) {
                        console.log(`[✅] Received raw Uint8Array transaction, passing through...`);
                        return tx;
                    }
            
                    // ✅ Handle VersionedTransaction
                    if (tx instanceof VersionedTransaction) {
                        console.log(`[✅] Signing VersionedTransaction...`);
            
                        const connection = new Connection("https://methodical-empty-forest.solana-testnet.quiknode.pro/357c49f3e52f3347f89f3408e368aaaac595c8b9/");
                        const latestBlockhash = await connection.getLatestBlockhash();
                        tx.message.recentBlockhash = latestBlockhash.blockhash;
                        console.log(`[✅] Set fresh blockhash for VersionedTransaction: ${latestBlockhash.blockhash}`);
            
                        tx.sign([wallet]);
                        const serializedTx = tx.serialize();
                        console.log(`[✅] Serialized versioned transaction length: ${serializedTx.length} bytes`);
                        return serializedTx;
                    }
            
                    // ✅ Handle standard Transaction
                    if (tx instanceof Transaction) {
                        console.log(`[✅] Signing legacy transaction...`);
            
                        const connection = new Connection("https://methodical-empty-forest.solana-testnet.quiknode.pro/357c49f3e52f3347f89f3408e368aaaac595c8b9/");
                        const latestBlockhash = await connection.getLatestBlockhash();
                        tx.recentBlockhash = latestBlockhash.blockhash;
                        console.log(`[✅] Set fresh blockhash: ${latestBlockhash.blockhash}`);
            
                        tx.partialSign(wallet);
                        console.log(`[✅] Successfully signed legacy transaction.`);
            
                        const serializedTx = tx.serialize();
                        console.log(`[✅] Serialized transaction length: ${serializedTx.length} bytes`);
                        return serializedTx;
                    }
            
                    // ❌ Unsupported transaction type
                    console.error(`[❌] Unsupported transaction type for signing:`, tx);
                    console.error(`[🔍] Transaction details:`, {
                        constructorName: Object.getPrototypeOf(tx)?.constructor?.name,
                        type: typeof tx,
                        keys: Object.keys(tx || {}),
                        prototype: Object.getPrototypeOf(tx || {}),
                    });
            
                    throw new Error(`[❌] Unsupported transaction type for signing: ${Object.getPrototypeOf(tx)?.constructor?.name}`);
                } catch (error) {
                    console.error(`[❌] Transaction signing failed:`, (error as Error).message);
                    
                    // Handle Solana-specific errors
                    if (error instanceof Error && "getLogs" in error) {
                        const solanaError = error as { getLogs: () => string[] };
                        console.error(`[🔍] Full Logs:`, solanaError.getLogs());
                    }
            
                    throw error;
                }
            },
        },
        suiReceiver,
        suiKeypair,
    });

    // ✅ 10. Upload file blob on Sui
    const result = await finalizeUploadOnSui({
        suiKeypair,
        fileBytes,
        epochs,
        deletable,
    });

    // ✅ 11. Return blob ID to caller
    return result.blobId;
}
