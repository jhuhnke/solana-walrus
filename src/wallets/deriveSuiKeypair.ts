import { WebCryptoSigner } from "@mysten/signers/webcrypto";
import { get, set } from "idb-keyval";

const KEY_NAME = "sui-webcrypto-key";

/**
 * Load an existing WebCryptoSigner from IndexedDB or generate a new one.
 */
export async function getWebCryptoSigner() {
	let exported: any = await get(KEY_NAME);

	let signer;
	if (exported) {
		signer = await WebCryptoSigner.import(exported);
	} else {
		signer = await WebCryptoSigner.generate();
		await set(KEY_NAME, signer.export());
	}

	return {
		addr: signer.getPublicKey().toSuiAddress(),
		signer,
	};
}
