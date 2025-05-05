import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";
import { getSDKConfig } from "../config";

/**
 * Downloads blob contents from Walrus using client extension.
 * Returns the original file content as a Uint8Array.
 */
export async function getBlobData(blobId: string): Promise<Uint8Array> {
	const config = getSDKConfig();

	// 1. Initialize a SuiClient and extend with Walrus
	const client = new SuiClient({
		url: config.suiUrl || getFullnodeUrl(config.network),
		network: config.network,
	}).$extend(WalrusClient.experimental_asClientExtension());

	// 2. Read blob from Walrus
	const blobBytes = await client.walrus.readBlob({ blobId });

	return new Uint8Array(blobBytes);
}
