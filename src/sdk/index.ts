// src/sdk/index.ts

import { configureSDK, getSDKConfig, getSuiClient, getWalrusClient } from "../config";
import { uploadFile } from "../solana/upload";
import { deleteFile } from "../solana/delete";
import { getBlobData } from "../walrus/download";
import { getBlobAttributesByObjectId } from "../walrus/attributes";
import { getStorageQuote } from "../utils/encoding";
import { UploadOptions } from "../types";
import { PublicKey } from "@solana/web3.js";

export class WalrusSolanaSDK {
    constructor(config) {
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
    async delete(blobObjectId: string, wallet: { publicKey: PublicKey }): Promise<void> {
        return deleteFile({ blobObjectId, wallet });
    }

    /**
     * Download a file by blob ID.
     */
    async download(blobId: string): Promise<Uint8Array> {
        return getBlobData(blobId);
    }

    /**
     * Read on-chain blob attributes.
     */
    async getAttributes(blobObjectId: string): Promise<Record<string, string>> {
        return getBlobAttributesByObjectId(blobObjectId);
    }

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

/**
 * Directly expose utility functions for convenience.
 */
export {
    configureSDK,
    getSDKConfig,
    getSuiClient,
    getWalrusClient,
    getStorageQuote,
};
