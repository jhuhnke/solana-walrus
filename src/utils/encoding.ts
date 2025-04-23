import { getWalrusClient } from '../walrus/client'; 
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'; 

export async function getStorageQuote(bytes: number): Promise<number> {
	const dummyFile = new Uint8Array(bytes);
	const walrusClient = getWalrusClient();

	const encoded = await walrusClient.encodeBlob(dummyFile);
	const quote = await walrusClient.getQuote({
		blobId: encoded.blobId,
		size: bytes,
		epochs: 3,
		deletable: true,
	});

	return quote.total;
}

export async function hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer); 
    return Buffer.from(hashBuffer).toString('hex'); 
}