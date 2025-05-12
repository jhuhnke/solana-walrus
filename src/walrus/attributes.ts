import { initializeClients} from "./client";

/**
 * Fetches on-chain attributes (key-value metadata) for a Walrus blob.
 */
export async function getBlobAttributesByObjectId(
	blobObjectId: string,
): Promise<Record<string, string>> {

	const { walrusClient } = initializeClients();
	
	const attributes = await walrusClient.readBlobAttributes({
		blobObjectId,
	});

	if (!attributes) {
		throw new Error(`No attributes found for blobObjectId: ${blobObjectId}`);
	}

	return attributes;
}
