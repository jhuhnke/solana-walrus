import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { PublicKey, Connection } from "@solana/web3.js";
import { UploadOptions } from "../types";
import { getWalrusClient } from "./client";
import { getSDKConfig } from "../config";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";

export async function uploadFile(options: UploadOptions): Promise<string> {
	const {
		file,
		wallet,
		suiReceiverAddress,
		epochs,
		deletable,
		connection,
	} = options;

	// 0. Load SDK config
	const config = getSDKConfig();

	// 1. Use correct Solana RPC
	const solanaConnection =
		connection || new Connection(config.solanaRpcUrl || getDefaultSolanaRpc(config.network));

	// 2. Calculate file hash and size
	const fileSize = file.size;
	const fileHash = await hashFile(file);

	// 3. Get quote
	const quote = await getStorageQuote({
		bytes: fileSize,
		epochs,
		deletable,
	});
	const estimatedSOL = quote.totalCost;

	// 4. Pull token addresses for current network
	const { wsSol, wal } = config.tokenAddresses[config.network];

	const suiReceiver = suiReceiverAddress || "auto-derived-sui-address"; // TODO: derive from Solana pubkey

	// 5. Check Astros gas sponsorship
	const gasFree = await isAstrosGasFreeSwapAvailable(
		wsSol,
		wal,
		(estimatedSOL * 1e9).toFixed(0),
		suiReceiver
	);

	// 6. Adjust fee
	const protocolFeePercent = gasFree ? 0.01 : 0.02;
	const totalSOL = estimatedSOL * (1 + protocolFeePercent);

	// 7. Pay treasury fee
	const { remainingSOL } = await transferProtocolFee({
		connection: solanaConnection,
		payer: wallet,
		amountSOL: totalSOL,
	});

	// 8. Send Wormhole message
	const blobId = await createAndSendWormholeMsg({
		fileHash,
		fileSize,
		amountSOL: remainingSOL,
		solanaPubkey: wallet.publicKey as PublicKey,
		suiReceiver,
	});

	return blobId;
}

// Helper for default RPC URLs
function getDefaultSolanaRpc(network: 'mainnet' | 'testnet'): string {
	return network === 'mainnet'
		? 'https://api.mainnet-beta.solana.com'
		: 'https://api.testnet.solana.com';
}
