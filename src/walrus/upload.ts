import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getSuiClient, getWalrusClient, getSDKConfig } from "../config";

export interface FinalizeUploadResult {
    blobId: string;
    uploadTxDigest: string;
    certifyTxDigest: string;
}

export interface FinalizeUploadOptions {
    suiKeypair: Ed25519Keypair;
    fileBytes: Uint8Array;
    deletable?: boolean;
    epochs?: number;
}

/**
 * Finalize the upload of a Walrus blob on Sui.
 */
export async function finalizeUploadOnSui(options: FinalizeUploadOptions): Promise<FinalizeUploadResult> {
    try {
        const { suiKeypair, fileBytes, deletable = true, epochs = 3 } = options;
        const sender = suiKeypair.getPublicKey().toSuiAddress();

        const suiClient = getSuiClient();
        const walrusClient = getWalrusClient();
        const config = getSDKConfig();
        const { wal } = config.tokenAddresses[config.network];

        console.log(`[✅] Using WAL coin type: ${wal}`);
        console.log(`[🔑] Sui Sender Address: ${sender}`);

        // ✅ Skip WAL balance enforcement — assume swap already occurred
        console.log(`[ℹ️] Skipping WSOL → WAL fallback. Assuming WAL balance is already handled.`);

        // 1. Encode the file
        console.log(`[🗄️] Encoding file...`);
        const encoded = await walrusClient.encodeBlob(fileBytes);
        console.log(`[✅] Encoding complete. Blob ID: ${encoded.blobId}`);

        // 2. Register the blob
        console.log(`[📝] Registering blob with ID: ${encoded.blobId}...`);
        const registerTx = await walrusClient.registerBlobTransaction({
            blobId: encoded.blobId,
            rootHash: encoded.rootHash,
            size: fileBytes.length,
            deletable,
            epochs,
            owner: sender,
        });

        const registerResult = await suiClient.signAndExecuteTransaction({
            signer: suiKeypair,
            transaction: registerTx,
            options: { showEffects: true, showObjectChanges: true },
        });
        console.log(`[✅] Blob registration complete. Result:`, registerResult);

        // 3. Locate the blob object
        console.log(`[🔍] Locating blob object...`);
        const blobType = await walrusClient.getBlobType();

        const blobObject = registerResult.objectChanges?.find(
            (obj) => obj.type === "created" && "objectType" in obj && obj.objectType === blobType
        ) as { objectId: string } | undefined;

        if (!blobObject) {
            throw new Error(`[❌] Blob object not found in transaction result.`);
        }

        console.log(`[✅] Blob object found. Object ID: ${blobObject.objectId}`);

        // 4. Upload encoded blob data to nodes
        console.log(`[🔄] Writing encoded blob to nodes...`);
        const confirmations = await walrusClient.writeEncodedBlobToNodes({
            blobId: encoded.blobId,
            metadata: encoded.metadata,
            sliversByNode: encoded.sliversByNode,
            deletable,
            objectId: blobObject.objectId,
        });
        console.log(`[✅] Blob written to nodes. Confirmations:`, confirmations);

        // 5. Certify the blob
        console.log(`[🔒] Certifying blob...`);
        const certifyTx = await walrusClient.certifyBlobTransaction({
            blobId: encoded.blobId,
            blobObjectId: blobObject.objectId,
            confirmations,
            deletable,
        });

        const certifyResult = await suiClient.signAndExecuteTransaction({
            signer: suiKeypair,
            transaction: certifyTx,
            options: { showEffects: true, showObjectChanges: true },
        });
        console.log(`[✅] Blob certification complete. Result:`, certifyResult);

        if (certifyResult.effects?.status.status !== "success") {
            throw new Error("[❌] Certify blob transaction failed");
        }

        console.log(`[✅] Blob certification successful. Blob ID: ${encoded.blobId}`);

        return {
            blobId: encoded.blobId,
            uploadTxDigest: registerResult.digest,
            certifyTxDigest: certifyResult.digest,
        };

    } catch (error) {
        console.error(`[❌] Error in finalizeUploadOnSui:`, error);
        throw error;
    }
}
