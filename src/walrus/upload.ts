import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { PublicKey, Connection } from "@solana/web3.js";
import { UploadOptions } from "../types";
import { getWalrusClient } from "./client";
import { getSDKConfig } from "../config";
import { transferProtocolFee } from "../bridge/treasury";

export async function uploadFile(options: UploadOptions): Promise<string> {
	// 🔐 Enforce that SDK is configured
	getSDKConfig(); // Will throw an error if not configured

	const {
		file,
		wallet,
		suiReceiverAddress,
		epochs,
		deletable,
		connection = new Connection('https://api.devnet.solana.com'), // fallback
	} = options;

	// 1. Get file size and hash
	const fileSize = file.size;
	const fileHash = await hashFile(file);

	// 2. Get storage quote
	const quote = await getStorageQuote({
		bytes: file.size,
		epochs,
		deletable,
	});

	// 3. Apply 1% protocol fee
	const totalSOL = quote.totalCost * 1.01;

	// 4. Transfer fee to protocol treasury, get remaining SOL
	const { remainingSOL, feePaid } = await transferProtocolFee({
		connection,
		payer: wallet,
		amountSOL: totalSOL,
	});

	// 5. Send Wormhole message with post-fee amount
	const blobId = await createAndSendWormholeMsg({
		fileHash,
		fileSize,
		amountSOL: remainingSOL,
		solanaPubkey: wallet.publicKey,
		suiReceiver: suiReceiverAddress,
	});

	return blobId;
}
