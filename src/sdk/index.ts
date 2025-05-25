import { configureSDK, getSDKConfig, getSuiClient, getWalrusClient } from "../config";
import { uploadFile } from "../solana/upload";
import { deleteFile } from "../solana/delete";
import { getBlobData } from "../walrus/read";
import { getBlobAttributesByObjectId } from "../walrus/attributes";
import { getStorageQuote } from "../utils/encoding";
import { UploadOptions } from "../types";

// Export the configureSDK function
export { configureSDK, getSDKConfig, getSuiClient, getWalrusClient };

export class WalrusSolanaSDK {
    constructor(config) {
        // ✅ Configure and initialize clients
        configureSDK(config);
    }

    /**
     * Upload a file to Walrus via Solana → Sui.
     * Returns blobId and blobObjectId.
     */
    async upload(options: UploadOptions): Promise<string> {
        if (typeof options.file !== "string") {
            throw new Error("[❌] Expected a file path string for the 'file' parameter.");
        }

        // ✅ Pass the full UploadOptions object
        return await uploadFile(options);
    }

    /**
     * Delete a blob from Walrus using its object ID.
     */
    async delete(blobObjectId: string, walletPath: string, mnemonicPath: string): Promise<void> {
        return deleteFile({
            blobObjectId,
            walletPath,
            mnemonicPath,
        });
    }

    /**
     * Read a file by blob ID.
     */
    async read(blobId: string): Promise<Uint8Array> {
        return getBlobData(blobId);
    }

    /**
     * Read on-chain blob attributes.
     */
    // async getAttributes(blobObjectId: string): Promise<Record<string, string>> {
    //     return getBlobAttributesByObjectId(blobObjectId);
    // }

    /**
     * Get on-chain storage price in SOL. 
     */
    async storageQuote(fileSize: number, epochs: number) {
        return getStorageQuote({
            bytes: fileSize, 
            epochs, 
        }); 
    }

    /**
     * Get the current SDK configuration.
     */
    getConfig() {
        return getSDKConfig();
    }

    /**
     * Get the Sui client.
     */
    getSuiClient() {
        return getSuiClient();
    }

    /**
     * Get the Walrus client.
     */
    getWalrusClient() {
        return getWalrusClient();
    }
}
