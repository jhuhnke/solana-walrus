import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { PublicKey, Connection } from "@solana/web3.js";
import { UploadOptions } from "../types";
import { getSDKConfig } from "../config";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";
import { finalizeUploadOnSui } from "./uploadOnSui";

export async function uploadFile(options: UploadOptions): Promise<string> {
	const {
		file,
		wallet,
		suiReceiverAddress,
		suiKeypair,
		epochs,
		deletable,
		connection,
	} = options;

	const config = getSDKConfig();

	// ✅ 0. Enforce suiKeypair is provided
	if (!suiKeypair) {
		throw new Error("[Walrus SDK] `suiKeypair` is required to finalize upload on Sui.");
	}

	// 1. Use correct Solana RPC
	const solanaConnection =
		connection || new Connection(config.solanaRpcUrl || getDefaultSolanaRpc(config.network));

	// 2. Hash and size
	const fileSize = file.size;
	const fileHash = await hashFile(file);
	const fileBytes = new Uint8Array(await file.arrayBuffer());

	// 3. Get Walrus storage quote
	const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });
	const estimatedSOL = quote.totalCost;

	// 4. Token info
	const { wsSol, wal } = config.tokenAddresses[config.network];
	const suiReceiver = suiReceiverAddress || suiKeypair.getPublicKey().toSuiAddress();

	// 5. Check if Astros will sponsor the swap
	const gasFree = await isAstrosGasFreeSwapAvailable(
		wsSol,
		wal,
		(estimatedSOL * 1e9).toFixed(0),
		suiReceiver
	);

	// 6. Apply protocol fee
	const protocolFeePercent = gasFree ? 0.01 : 0.02;
	const totalSOL = estimatedSOL * (1 + protocolFeePercent);

	// 7. Transfer protocol fee
	const { remainingSOL } = await transferProtocolFee({
		connection: solanaConnection,
		payer: wallet,
		amountSOL: totalSOL,
	});

	// 8. Send Wormhole message
	await createAndSendWormholeMsg({
		fileHash,
		fileSize,
		amountSOL: remainingSOL,
		solanaPubkey: wallet.publicKey as PublicKey,
		suiReceiver,
	});

	// 9. Finalize upload on Sui
	const result = await finalizeUploadOnSui({
		suiKeypair,
		fileBytes,
		epochs,
		deletable,
	});

	return result.blobId;
}

// Helper for default RPC URLs
function getDefaultSolanaRpc(network: 'mainnet' | 'testnet'): string {
	return network === 'mainnet'
		? 'https://api.mainnet-beta.solana.com'
		: 'https://api.testnet.solana.com';
}
