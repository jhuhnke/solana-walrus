import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { PublicKey } from "@solana/web3.js";

// In-memory map of SolanaPubkey → SuiKeypair
const keyCache: Record<string, Ed25519Keypair> = {};

/**
 * Generate and persist a Sui keypair for a given Solana public key.
 */
export function getCachedOrCreateSuiKeypair(solanaPubkey: PublicKey): Ed25519Keypair {
	const pubkeyStr = solanaPubkey.toBase58();

	// Return from cache if exists
	if (keyCache[pubkeyStr]) return keyCache[pubkeyStr];

	// Else generate a new one and cache it
	const newKeypair = Ed25519Keypair.generate();
	keyCache[pubkeyStr] = newKeypair;

	return newKeypair;
}
