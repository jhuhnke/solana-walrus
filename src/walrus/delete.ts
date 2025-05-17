import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getWalrusClient } from "../config";

/**
 * Delete a blob on Sui.
 */
export async function deleteBlob(blobObjectId: string, suiKeypair: Ed25519Keypair) {
    const walrusClient = getWalrusClient();

    console.log(`[🗑️] Deleting blob: ${blobObjectId}...`);

    try {
        // ✅ Use the built-in delete method from WalrusClient
        const result = await walrusClient.executeDeleteBlobTransaction({
            signer: suiKeypair,
            blobObjectId,
        });

        console.log(`[✅] Blob deleted: ${blobObjectId}`);
        return result;
    } catch (error) {
        console.error("[❌] Failed to delete blob:", error);
        throw error;
    }
}
