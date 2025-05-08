import { configureSDK, SDKConfig } from "../config";
import { uploadFile } from "../solana/upload";
import { deleteFile } from "../solana/delete";
import { getBlobData } from "../walrus/download";
import { getBlobAttributesByObjectId } from "../walrus/attributes";
import { UploadOptions } from "../types";
import { PublicKey } from "@solana/web3.js";

export class WalrusSolanaSDK {
	constructor(config: SDKConfig) {
		configureSDK(config);
	}

	/**
	 * Upload a file to Walrus via Solana → Sui.
	 * Returns blobId and blobObjectId.
	 */
	async upload(options: UploadOptions): Promise<string> {
		return uploadFile(options); 
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
}
