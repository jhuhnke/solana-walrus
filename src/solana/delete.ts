import { PublicKey, Connection } from "@solana/web3.js";
import { deleteBlob } from "../walrus/delete";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getSDKConfig } from "../config";
import fs from "fs";

/**
 * Load the Sui keypair from the mnemonic in import.json.
 */
function loadSuiKeypairFromMnemonic(): Ed25519Keypair {
    const importPath = "./import.json";  // Replace with your actual import file path
    if (!fs.existsSync(importPath)) {
        throw new Error(`[❌] import.json not found at ${importPath}`);
    }

    const importData = JSON.parse(fs.readFileSync(importPath, "utf-8"));
    if (!importData.mnemonic) {
        throw new Error(`[❌] Invalid import.json file. 'mnemonic' field not found.`);
    }

    return Ed25519Keypair.deriveKeypair(importData.mnemonic);
}

/**
 * Delete a Walrus blob via a Solana user (uses mnemonic-based Sui keypair).
 */
export async function deleteFile(options: {
    blobObjectId: string;
    wallet: {
        publicKey: PublicKey;
    };
    connection?: Connection;
}): Promise<void> {
    const { blobObjectId } = options;

    const config = getSDKConfig();

    // 1. Load the Sui keypair from the mnemonic
    const suiKeypair = loadSuiKeypairFromMnemonic();
    console.log(`[🔑] Loaded Sui keypair: ${suiKeypair.getPublicKey().toSuiAddress()}`);

    // 2. Call the Sui-side deletion logic
    await deleteBlob(blobObjectId, suiKeypair);
    console.log(`[🗑️] Deleted blob: ${blobObjectId}`);
}
