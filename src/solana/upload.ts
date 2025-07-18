import { configureSDK, getSDKConfig } from "../config";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getStorageQuote, hashFile, fetchConversionRates } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";
import { finalizeUploadOnSui } from "../walrus/upload";
import { getWebCryptoSigner } from "../wallets/deriveSuiKeypair";
import { UploadOptions } from "../types";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";

const CUSTOM_RPC_URL_DEVNET = "https://api.devnet.solana.com";
const CUSTOM_RPC_URL_MAINNET = "https://api.mainnet-beta.solana.com";

function getCustomConnection(network: string): Connection {
	const url = network === "mainnet" ? CUSTOM_RPC_URL_MAINNET : CUSTOM_RPC_URL_DEVNET;
	return new Connection(url, "confirmed");
}

async function getCoinBalance(client: SuiClient, owner: string, coinType: string): Promise<bigint> {
	const response = await client.getCoins({ owner, coinType });
	return response.data.reduce((acc, coin) => acc + BigInt(coin.balance), 0n);
}

export async function uploadFile(options: UploadOptions): Promise<string> {
	const { file, wallet, suiReceiverAddress, epochs, deletable, connection } = options;
	console.log("[📤] Starting file upload...");

	if (!(wallet instanceof Keypair)) throw new Error("[❌] Expected a Solana Keypair.");
	if (typeof file !== "string" || !fs.existsSync(file)) throw new Error(`[❌] Invalid file path: ${file}`);

	const fileBytes = fs.readFileSync(file);
	const fileHash = await hashFile(fileBytes);
	const fileSize = fileBytes.length;
	console.log(`[✅] File size: ${fileSize} bytes, Hash: ${fileHash}`);

	const config = getSDKConfig();
	configureSDK({
		network: config.network,
		suiUrl: getFullnodeUrl(config.network),
		tokenAddresses: config.tokenAddresses,
	});

	const { signer: suiSigner, addr: suiAddress } = await getWebCryptoSigner();
	const suiReceiver = suiReceiverAddress?.startsWith("0x") ? suiReceiverAddress : suiAddress;
	console.log(`[✅] Sui signer resolved. Address: ${suiReceiver}`);

	const { wal, WSOL } = config.tokenAddresses[config.network];
	const suiClient = new SuiClient({ url: config.suiUrl || getFullnodeUrl(config.network) });
	const solanaConnection = connection || getCustomConnection(config.network);

	// Quote
	const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });
	let estimatedWAL = quote.totalCost;
	console.log(`[✅] Storage quote received. Total cost: ${estimatedWAL} WAL`);

	if (config.network === "mainnet") {
		estimatedWAL *= 1.05;
		console.log(`[📈] Mainnet buffer applied. Adjusted WAL estimate: ${estimatedWAL.toFixed(9)} WAL`);
	}

	const totalWALWithFees = Math.ceil(estimatedWAL * 1.05 * 1.05 * 1e9) / 1e9;
	console.log(`[✅] Total WAL after 10% buffer: ${totalWALWithFees.toFixed(9)} WAL`);

	const { walToSol } = await fetchConversionRates();
	const totalSOL = totalWALWithFees * walToSol;
	console.log(`[💱] Converted WAL → SOL: ${totalSOL.toFixed(9)} SOL`);

	// Bridge WSOL via Wormhole
	await createAndSendWormholeMsg({
		fileHash,
		fileSize,
		amountSOL: totalSOL,
		wallet,
		suiReceiver,
		suiSigner,
	});
	console.log(`[✅] Wormhole message sent successfully.`);

	// Wait for WSOL to arrive
	async function waitForWSOLBalance(
		client: SuiClient,
		owner: string,
		coinType: string,
		retries = 10,
		delayMs = 1000,
	): Promise<bigint> {
		for (let i = 0; i < retries; i++) {
			const balance = await getCoinBalance(client, owner, coinType);
			if (balance > 0n) return balance;
			console.log(`[⏳] Waiting for WSOL balance... Attempt ${i + 1}/${retries}`);
			await new Promise((res) => setTimeout(res, delayMs));
		}
		throw new Error("Timed out waiting for WSOL balance on SUI.");
	}

	const totalWSOL = await waitForWSOLBalance(suiClient, suiReceiver, WSOL);
	console.log(`[🪙] Total WSOL balance for ${suiReceiver}: ${totalWSOL}`);

	// Swap WSOL → WAL
	if (totalWSOL > 0n) {
		if (totalWSOL > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("WSOL exceeds JS safe integer range.");
		const gasFree = await isAstrosGasFreeSwapAvailable(
			wal,
			Number(totalWSOL),
			suiReceiver,
			config.network,
			suiSigner
		);
		console.log(`[🔁] Gas-free WAL swap ${gasFree ? "succeeded" : "failed"}.`);
	} else {
		console.warn("[⚠️] No WSOL to swap for WAL. Skipping.");
	}

	// Pay protocol fee in SUI (0.01 * totalSOL)
	const feeSUI = totalSOL * 0.01;
	let feeTxDigest: string | null = null;

	for (let i = 0; i < 3; i++) {
		try {
			const { txDigest } = await transferProtocolFee({
				signer: suiSigner,
				amountSUI: feeSUI,
			});
			feeTxDigest = txDigest;
			console.log(`[✅] Protocol fee of ${feeSUI} SUI sent via tx: ${txDigest}`);
			break;
		} catch (err) {
			console.warn(`[⚠️] Protocol fee attempt ${i + 1} failed. Retrying...`);
			await new Promise((r) => setTimeout(r, 1000));
		}
	}

	if (!feeTxDigest) {
		throw new Error("Protocol fee payment failed after 3 retries.");
	}

	// Finalize blob upload
	const result = await finalizeUploadOnSui({
		suiSigner,
		fileBytes,
		epochs,
		deletable,
	});
	console.log(`[✅] Blob uploaded successfully. Blob ID: ${result.blobId}`);
	return result.blobId;
}
