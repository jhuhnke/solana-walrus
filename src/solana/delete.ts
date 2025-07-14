import { Connection, Keypair } from "@solana/web3.js";
import { deleteBlob } from "../walrus/delete";
import { getWebCryptoSigner } from "../wallets/deriveSuiKeypair";
import { WebCryptoSigner } from "@mysten/signers/webcrypto";
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
 * Delete a Walrus blob using a Solana wallet and WebCrypto Sui signer.
 */
export async function deleteFile(options: {
	blobObjectId: string;
	walletPath: string;
	connection?: Connection;
}): Promise<void> {
	const { blobObjectId, walletPath, connection } = options;

	// ✅ Load the Solana wallet
	const solanaWallet = loadSolanaWallet(walletPath);
	console.log(`[🔑] Loaded Solana wallet: ${solanaWallet.publicKey.toBase58()}`);

	// ✅ Load the persisted WebCrypto signer
	const { signer: suiSigner, addr: suiAddr }: { signer: WebCryptoSigner; addr: string } = await getWebCryptoSigner();
	console.log(`[🔑] Loaded WebCrypto Sui signer: ${suiAddr}`);

	// ✅ Use provided connection or default
	const solanaConnection = connection || new Connection("https://api.devnet.solana.com", "confirmed");

	// ✅ Call the Sui-side deletion logic
	try {
		await deleteBlob(blobObjectId, suiSigner); // <-- fixed call (pass as 2 arguments, not object)
		console.log(`[🗑️] Deleted blob: ${blobObjectId}`);
	} catch (error: any) {
		console.error(`[❌] Failed to delete blob: ${error.message}`);
		throw error;
	}
}
