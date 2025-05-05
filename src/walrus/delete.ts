// src/walrus/delete.ts
import { getWalrusClient } from "./client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/**
 * Deletes a Walrus blob given the on-chain blob object ID.
 */
export async function deleteBlob(blobObjectId: string, signer: Ed25519Keypair): Promise<void> {
	const walrusClient = getWalrusClient();

	await walrusClient.executeDeleteBlobTransaction({
		signer,
		blobObjectId,
	});
}
