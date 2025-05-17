import { getSDKConfig } from "../config";
import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";
import { finalizeUploadOnSui } from "../walrus/upload";
import { getCachedOrCreateSuiKeypair } from "../wallets/deriveSuiKeypair";
import { UploadOptions } from "../types";
import {
  Connection,
  Keypair
} from "@solana/web3.js";
import fs from "fs";

// 🔧 Use your custom RPC for faster blockhash lookups
const CUSTOM_RPC_URL = 'https://api.devnet.solana.com';

// 🔄 Get a connection to your custom RPC
function getCustomConnection(): Connection {
  return new Connection(CUSTOM_RPC_URL, "confirmed");
}

export async function uploadFile(options: UploadOptions): Promise<string> {
  const {
    file,
    wallet,
    suiReceiverAddress,
    suiKeypair: userProvidedSuiKeypair,
    epochs,
    deletable,
    connection,
    mnemonicPath,  // ✅ Corrected extraction
  } = options;

  console.log("[📤] Starting file upload...");

  // ✅ Validate wallet
  if (!(wallet instanceof Keypair)) {
    throw new Error("[❌] Expected a Solana Keypair for the payer.");
  }

  // ✅ Validate file path
  if (typeof file !== "string" || !fs.existsSync(file)) {
    throw new Error(`[❌] Expected a valid file path string, but got ${typeof file}: ${file}`);
  }

  // ✅ Read the file as Uint8Array
  const fileBytes = fs.readFileSync(file);
  const fileHash = await hashFile(fileBytes);
  const fileSize = fileBytes.length;
  console.log(`[✅] File size: ${fileSize} bytes, Hash: ${fileHash}`);

  // ✅ Use or generate Sui keypair
  const suiKeypair = userProvidedSuiKeypair || getCachedOrCreateSuiKeypair(wallet.publicKey, "./import.json");
  const suiReceiver = suiReceiverAddress || suiKeypair.getPublicKey().toSuiAddress();
  console.log(`[✅] Sui keypair resolved. Address: ${suiReceiver}`);

  // ✅ Use provided connection or default
  const solanaConnection = connection || getCustomConnection();

  // ✅ Fetch storage quote in WAL
  const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });
  const estimatedWAL = quote.totalCost;  // This is in WAL
  console.log(`[✅] Storage quote received. Total cost: ${estimatedWAL} WAL`);

  // ✅ Get token info
  const config = getSDKConfig();
  const { wsSol, wal } = config.tokenAddresses[config.network];

  // ✅ Check Astros gas sponsorship
  if (!mnemonicPath) {
    throw new Error("[❌] Missing required mnemonic path for gas-free swap check.");
  }

  const estimatedWALInLamports = Math.floor(estimatedWAL * 1e9); 
  const gasFree = await isAstrosGasFreeSwapAvailable(
      wal,
      estimatedWALInLamports,
      suiReceiver,
      config.network,
      mnemonicPath
  );
  const protocolFeePercent = gasFree ? 0.01 : 0.02;
  const totalWALWithFees = estimatedWAL * (1 + protocolFeePercent);
  console.log(`[✅] Total WAL after fees: ${totalWALWithFees.toFixed(9)} WAL`);

  // ✅ Transfer protocol fee to treasury
  const { remainingSOL } = await transferProtocolFee({
    connection: solanaConnection,
    payer: wallet,
    amountSOL: totalWALWithFees,  // This should be in WAL, not SOL
  });
  console.log(`[✅] Remaining WAL after fee transfer: ${remainingSOL} WAL`);

  // ✅ Send the wormhole message
  await createAndSendWormholeMsg({
      fileHash,
      fileSize,
      amountSOL: remainingSOL,
      wallet,  
      suiReceiver,
      suiKeypair,
      mnemonicPath,
  });
  console.log(`[✅] Wormhole message sent successfully.`);

  // ✅ Finalize the upload on Sui
  const result = await finalizeUploadOnSui({
    suiKeypair,
    fileBytes,
    epochs,
    deletable,
  });

  // ✅ Return blob ID
  console.log(`[✅] Blob uploaded successfully. Blob ID: ${result.blobId}`);
  return result.blobId;
}
