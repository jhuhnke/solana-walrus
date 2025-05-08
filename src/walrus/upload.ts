import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getWalrusClient } from "../walrus/client";
import { swapWSOLtoWAL } from "../swap/dexRouter";
import { getSDKConfig } from "../config";

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
	walAmount?: number;
}

/**
 * Finalize the upload of a Walrus blob on Sui.
 */
export async function finalizeUploadOnSui(options: FinalizeUploadOptions): Promise<FinalizeUploadResult> {
	const { suiKeypair, fileBytes, deletable = true, epochs = 3, walAmount = 0.1 } = options;
	const config = getSDKConfig();
	const suiClient = new SuiClient({ url: config.suiUrl! });
	const sender = suiKeypair.getPublicKey().toSuiAddress();
	const walrusClient = getWalrusClient();

	// ✅ 1. Swap WSOL → WAL
	await swapWSOLtoWAL({
		signer: suiKeypair,
		wsSolCoinType: config.tokenAddresses[config.network].wsSol,
		walCoinType: config.tokenAddresses[config.network].wal,
		amount: (walAmount * 1e9).toFixed(0),
	});

	// ✅ 2. Encode the file (generates blobId, rootHash, metadata, slivers)
	const encoded = await walrusClient.encodeBlob(fileBytes);

	// ✅ 3. Register the blob
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

	// ✅ 4. Find the blob object
	const blobType = await walrusClient.getBlobType();
	const blobObject = registerResult.objectChanges?.find(
		(obj) => obj.type === "created" && "objectType" in obj && obj.objectType === blobType
	) as { objectId: string } | undefined;

	if (!blobObject) {
		throw new Error("Blob object not found in transaction result");
	}

	// ✅ 5. Upload encoded blob data to nodes
	const confirmations = await walrusClient.writeEncodedBlobToNodes({
		blobId: encoded.blobId,
		metadata: encoded.metadata,
		sliversByNode: encoded.sliversByNode,
		deletable,
		objectId: blobObject.objectId,
	});

	// ✅ 6. Certify the blob
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

	if (certifyResult.effects?.status.status !== "success") {
		throw new Error("Certify blob transaction failed");
	}

	return {
		blobId: encoded.blobId,
		uploadTxDigest: registerResult.digest,
		certifyTxDigest: certifyResult.digest,
	};
}
