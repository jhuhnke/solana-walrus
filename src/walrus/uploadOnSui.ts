import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getWalrusClient } from "./client";
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
	walAmount?: number; // optional WSOL to WAL swap amount
}

export async function finalizeUploadOnSui(options: FinalizeUploadOptions): Promise<FinalizeUploadResult> {
	const {
		suiKeypair,
		fileBytes,
		deletable = true,
		epochs = 3,
		walAmount = 0.1,
	} = options;

	const config = getSDKConfig();
	const suiClient: SuiClient = new SuiClient({ url: config.suiUrl! });
	const sender = suiKeypair.getPublicKey().toSuiAddress();

	// 1. Swap WSOL → WAL
	await swapWSOLtoWAL({
		signer: suiKeypair,
		wsSolCoinType: config.tokenAddresses[config.network].wsSol,
		walCoinType: config.tokenAddresses[config.network].wal,
		amount: (walAmount * 1e9).toFixed(0),
	});

	// 2. Get Walrus client (still used for encode logic)
	const walrusClient = getWalrusClient();

	// 3. Encode the file (generates blobId, rootHash, metadata, slivers)
	const encoded = await walrusClient.encodeBlob(fileBytes);

	// 4. Build and submit registerBlob transaction manually
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
        options: {
            showEffects: true,
            showObjectChanges: true,
        },
    });
    
    const blobType = await walrusClient.getBlobType();
    
    const blobObject = registerResult.objectChanges?.find(
        obj => obj.type === "created" && "objectType" in obj && obj.objectType === blobType
    );
    
    if (!blobObject || blobObject.type !== "created") {
        throw new Error("Blob object not found");
    }
    
    const blobObjectId = blobObject.objectId;

	// 5. Upload data to Walrus nodes
	const confirmations = await walrusClient.writeEncodedBlobToNodes({
		blobId: encoded.blobId,
		metadata: encoded.metadata,
		sliversByNode: encoded.sliversByNode,
		deletable,
		objectId: blobObject.objectId,
	});

	// 6. Certify blob
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
		throw new Error("Certify blob transaction failed.");
	}

	return {
		blobId: encoded.blobId,
		uploadTxDigest: registerResult.digest,
		certifyTxDigest: certifyResult.digest,
	};
}
