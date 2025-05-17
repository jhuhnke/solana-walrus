import { Connection, Keypair } from "@solana/web3.js";
import { deleteBlob } from "../walrus/delete";
import { getCachedOrCreateSuiKeypair } from "../wallets/deriveSuiKeypair";
import fs from "fs";

/**
 * Load Solana wallet from the provided path.
 */
function loadSolanaWallet(walletPath: string): Keypair {
    if (!fs.existsSync(walletPath)) {
        throw new Error(`[❌] Solana wallet file not found at ${walletPath}`);
    }

    const secretKeyData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
    return Keypair.fromSecretKey(Uint8Array.from(secretKeyData));
}

/**
 * Delete a Walrus blob using a Solana wallet and Sui keypair.
 */
export async function deleteFile(options: {
    blobObjectId: string;
    walletPath: string;
    mnemonicPath: string;
    connection?: Connection;
}): Promise<void> {
    const { blobObjectId, walletPath, mnemonicPath, connection } = options;

    // ✅ Load the Solana wallet
    const solanaWallet = loadSolanaWallet(walletPath);
    console.log(`[🔑] Loaded Solana wallet: ${solanaWallet.publicKey.toBase58()}`);

    // ✅ Load or derive the Sui keypair
    const suiKeypair = getCachedOrCreateSuiKeypair(solanaWallet.publicKey, mnemonicPath);
    console.log(`[🔑] Loaded Sui keypair: ${suiKeypair.getPublicKey().toSuiAddress()}`);

    // ✅ Use provided connection or default
    const solanaConnection = connection || new Connection("https://api.devnet.solana.com", "confirmed");

    // ✅ Call the Sui-side deletion logic
    try {
        await deleteBlob(blobObjectId, suiKeypair);
        console.log(`[🗑️] Deleted blob: ${blobObjectId}`);
    } catch (error) {
        console.error(`[❌] Failed to delete blob: ${error.message}`);
        throw error;
    }
}
