import { getWalrusClient } from "../config";

/**
 * Downloads blob contents from Walrus using the shared SuiClient.
 * Returns the original file content as a Uint8Array.
 */
export async function getBlobData(blobId: string): Promise<Uint8Array> {
    try {
        // ✅ Use the shared SuiClient and WalrusClient
        console.log(`[🔄] Fetching blob data for Blob ID: ${blobId}`);
       
        const walrusClient = getWalrusClient(); 

        // ✅ Read the blob from Walrus
        const blobBytes = await walrusClient.readBlob({ blobId });

        console.log(`[✅] Blob data retrieved. Size: ${blobBytes.length} bytes`);
        return new Uint8Array(blobBytes);
    } catch (error) {
        console.error(`[❌] Failed to fetch blob data for Blob ID ${blobId}:`, error);
        throw error;
    }
}
