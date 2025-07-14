import { WebCryptoSigner } from "@mysten/signers/webcrypto";
import { getWalrusClient } from "../config";

/**
 * Delete a blob on Sui.
 */
export async function deleteBlob(
  blobObjectId: string,
  signer: WebCryptoSigner
): Promise<{ digest: string }> {
  const walrusClient = getWalrusClient();

  console.log(`[🗑️] Deleting blob: ${blobObjectId}...`);

  try {
    const result = await walrusClient.executeDeleteBlobTransaction({
      signer,
      blobObjectId,
    });

    console.log(`[✅] Blob deleted: ${blobObjectId}`);
    return result;
  } catch (error) {
    console.error("[❌] Failed to delete blob:", error);
    throw error;
  }
}
