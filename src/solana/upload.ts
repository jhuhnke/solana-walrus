import { getSDKConfig } from "../config";
import { getStorageQuote, hashFile, fetchConversionRates } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";
import { finalizeUploadOnSui } from "../walrus/upload";
import { getWebCryptoSigner } from "../wallets/deriveSuiKeypair"; 
import { UploadOptions } from "../types";
import { Connection, Keypair } from "@solana/web3.js";
import { WebCryptoSigner } from "@mysten/signers/webcrypto";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import fs from "fs";

const CUSTOM_RPC_URL_DEVNET = "https://api.devnet.solana.com";
const CUSTOM_RPC_URL_MAINNET = "https://api.mainnet-beta.solana.com";

function getCustomConnection(network: string): Connection {
	const url = network === "mainnet" ? CUSTOM_RPC_URL_MAINNET : CUSTOM_RPC_URL_DEVNET;
	return new Connection(url, "confirmed");
}

function convertToEd25519Keypair(signer: WebCryptoSigner): Ed25519Keypair {
	const exported = signer.export();
	if (!("privateKey" in exported)) {
		throw new Error("WebCryptoSigner does not expose a private key. Use a supported signer.");
	}
	const secretKeyB64 = (exported as any).privateKey.k;
	const secretKeyBytes = fromB64(secretKeyB64);
	return Ed25519Keypair.fromSecretKey(secretKeyBytes);
}

export async function uploadFile(options: UploadOptions): Promise<string> {
	const {
		file,
		wallet,
		suiReceiverAddress,
		epochs,
		deletable,
		connection,
	} = options;

	console.log("[📤] Starting file upload...");

	if (!(wallet instanceof Keypair)) {
		throw new Error("[❌] Expected a Solana Keypair for the payer.");
	}

	if (typeof file !== "string" || !fs.existsSync(file)) {
		throw new Error(`[❌] Invalid file path: ${file}`);
	}

	const fileBytes = fs.readFileSync(file);
	const fileHash = await hashFile(fileBytes);
	const fileSize = fileBytes.length;
	console.log(`[✅] File size: ${fileSize} bytes, Hash: ${fileHash}`);

	// ✅ Resolve Sui signer
	const { signer: suiSigner, addr: suiAddress } = await getWebCryptoSigner();
	const suiReceiver =
		suiReceiverAddress && suiReceiverAddress.startsWith("0x")
			? suiReceiverAddress
			: suiAddress;

	console.log(`[✅] Sui signer resolved. Address: ${suiReceiver}`);

	const config = getSDKConfig();
	const { wal } = config.tokenAddresses[config.network];
	const solanaConnection = connection || getCustomConnection(config.network);

	const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });
	let estimatedWAL = quote.totalCost;
	console.log(`[✅] Storage quote received. Total cost: ${estimatedWAL} WAL`);

	if (config.network === "mainnet") {
		estimatedWAL *= 1.05;
		console.log(`[📈] Mainnet buffer applied. Adjusted WAL estimate: ${estimatedWAL.toFixed(9)} WAL`);
	}

	const totalWALWithFees = estimatedWAL * 1.02;
	console.log(`[✅] Total WAL after 2% fees: ${totalWALWithFees.toFixed(9)} WAL`);

	const { walToSol } = await fetchConversionRates();
	const totalSOL = totalWALWithFees * walToSol;
	console.log(`[💱] Converted WAL → SOL: ${totalSOL.toFixed(9)} SOL`);

	const remainingSOL = totalSOL;

	await createAndSendWormholeMsg({
		fileHash,
		fileSize,
		amountSOL: remainingSOL,
		wallet,
		suiReceiver,
	});
	console.log(`[✅] Wormhole message sent successfully.`);

	const bridgedWSOLInLamports = Math.floor(remainingSOL * 1e9);
	const gasFree = await isAstrosGasFreeSwapAvailable(
		wal,
		bridgedWSOLInLamports,
		suiReceiver,
		config.network
	);
	console.log(`[🔁] Gas-free WAL swap ${gasFree ? "succeeded" : "failed"}.`);

	const feeSUI = totalSOL * 0.01;
	const suiKeypair = convertToEd25519Keypair(suiSigner);
	const { txDigest } = await transferProtocolFee({
		signer: suiKeypair,
		amountSUI: feeSUI,
	});
	console.log(`[✅] Protocol fee of ${feeSUI} SUI sent via tx: ${txDigest}`);

	const result = await finalizeUploadOnSui({
		suiSigner,
		fileBytes,
		epochs,
		deletable,
	});

	console.log(`[✅] Blob uploaded successfully. Blob ID: ${result.blobId}`);
	return result.blobId;
}
