// src/walrus/delete.ts

import { getSuiClient, getWalrusClient } from "../config";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/**
 * Deletes a Walrus blob given the on-chain blob object ID.
 */
export async function deleteBlob(blobObjectId: string, signer: Ed25519Keypair): Promise<void> {

    console.log(`[🗑️] Deleting blob: ${blobObjectId}...`);

    const suiClient = getSuiClient(); 
    const walrusClient = getWalrusClient(); 

    // ✅ 1. Create the delete transaction
    const deleteTx = await walrusClient.deleteBlobTransaction({
        blobObjectId,
        owner: signer.getPublicKey().toSuiAddress(),
    });

    // ✅ 2. Sign and execute the delete transaction
    const result = await suiClient.signAndExecuteTransaction({
        signer,
        transaction: deleteTx,
        options: { showEffects: true, showObjectChanges: true },
    });

    console.log(`[✅] Blob deleted successfully. Result:`, result);
}
