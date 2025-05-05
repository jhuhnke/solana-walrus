import { PublicKey, Connection } from "@solana/web3.js";
import { deleteBlob } from "../walrus/delete";
import { getCachedOrCreateSuiKeypair } from "../wallets/deriveSuiKeypair";
import { getSDKConfig } from "../config";

export interface DeleteOptions {
	blobObjectId: string;
	wallet: {
		publicKey: PublicKey;
	};
	connection?: Connection;
}

/**
 * Delete a Walrus blob via a Solana user (uses cached Sui keypair).
 */
export async function deleteFile(options: DeleteOptions): Promise<void> {
	const { blobObjectId, wallet } = options;

	const config = getSDKConfig();

	// 1. Derive or load the Sui keypair for this Solana wallet
	const suiKeypair = getCachedOrCreateSuiKeypair(wallet.publicKey);

	// 2. Call the Sui-side deletion logic
	await deleteBlob(blobObjectId, suiKeypair);
}
