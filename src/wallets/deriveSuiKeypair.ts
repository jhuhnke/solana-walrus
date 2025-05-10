import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";

// In-memory cache for SolanaPubkey → SuiKeypair
const keyCache: Record<string, Ed25519Keypair> = {};

/**
 * Load a mnemonic from a JSON file.
 */
function loadMnemonicFromFile(filePath: string): string {
    try {
        const importData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (!importData.mnemonic) {
            throw new Error("Invalid import.json file. 'mnemonic' field not found.");
        }
        return importData.mnemonic;
    } catch (err) {
        if (err instanceof Error) {
            throw new Error(`Failed to load mnemonic from ${filePath}: ${err.message}`);
        }
        throw new Error(`Failed to load mnemonic from ${filePath}: Unknown error occurred.`);
    }
}


/**
 * Generate and persist a Sui keypair for a given Solana public key.
 */
export function getCachedOrCreateSuiKeypair(
    solanaPubkey: PublicKey,
    mnemonicFilePath: string
): Ed25519Keypair {
    const pubkeyStr = solanaPubkey.toBase58();

    // Return from cache if exists
    if (keyCache[pubkeyStr]) return keyCache[pubkeyStr];

    // Generate a keypair from the mnemonic
    const mnemonic = loadMnemonicFromFile(mnemonicFilePath);
    const baseKeypair = Ed25519Keypair.deriveKeypair(mnemonic);
    keyCache[pubkeyStr] = baseKeypair;

    return baseKeypair;
}
