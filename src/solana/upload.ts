// src/solana/upload.ts

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
  Keypair,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import fs from "fs";

// 🔧 Use your custom RPC for faster blockhash lookups
const CUSTOM_RPC_URL =
  'https://api.devnet.solana.com';

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
    mnemonicPath: string,
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

  // ✅ Read the file correctly as a Uint8Array
  const fileBytes = fs.readFileSync(file);
  const fileHash = await hashFile(fileBytes);
  const fileSize = fileBytes.length;
  console.log(`[✅] File size: ${fileSize} bytes, Hash: ${fileHash}`);

  // ✅ Use or generate Sui keypair
  const suiKeypair =
    userProvidedSuiKeypair || getCachedOrCreateSuiKeypair(wallet.publicKey, "./import.json");
  const suiReceiver =
    suiReceiverAddress || suiKeypair.getPublicKey().toSuiAddress();
  console.log(`[✅] Sui keypair resolved. Address: ${suiReceiver}`);

  // ✅ Use provided connection or default
  const solanaConnection = connection || getCustomConnection();

  // ✅ Fetch storage quote
  const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });
  const estimatedSOL = quote.totalCost;
  console.log(`[✅] Storage quote received. Total cost: ${estimatedSOL} SOL`);

  // ✅ Get token info
  const config = getSDKConfig();
  const { wsSol, wal } = config.tokenAddresses[config.network];

  // ✅ Check Astros gas sponsorship
  const mnemonicPath = options.mnemonicPath;
  if (!mnemonicPath) {
      throw new Error("[❌] Missing required mnemonic path for gas-free swap check.");
  }

  const gasFree = await isAstrosGasFreeSwapAvailable(
      wal,
      (estimatedSOL * 1e9).toFixed(0),
      suiReceiver,
      config.network,
      mnemonicPath
  );
  const protocolFeePercent = gasFree ? 0.01 : 0.02;
  const totalSOL = estimatedSOL * (1 + protocolFeePercent);
  console.log(`[✅] Total SOL after fees: ${totalSOL} SOL`);

  // ✅ Transfer protocol fee to treasury
  const { remainingSOL } = await transferProtocolFee({
    connection: solanaConnection,
    payer: wallet,
    amountSOL: totalSOL,
  });
  console.log(`[✅] Remaining SOL after fee transfer: ${remainingSOL} SOL`);

  // ✅ Send Wormhole message from Solana → Sui
  await createAndSendWormholeMsg({
    fileHash,
    fileSize,
    amountSOL: remainingSOL,
    wallet: {
      publicKey: wallet.publicKey,
      signTransaction: async (tx) => {
        try {
          console.log(`[📝] Attempting to sign transaction...`);

          if (tx instanceof Uint8Array) {
            console.log(`[✅] Received raw Uint8Array, passing through...`);
            return tx;
          }

          if (tx instanceof VersionedTransaction) {
            const { blockhash } =
              await solanaConnection.getLatestBlockhash("confirmed");
            tx.message.recentBlockhash = blockhash;
            tx.sign([wallet]);
            return tx.serialize();
          }

          if (tx instanceof Transaction) {
            const { blockhash } =
              await solanaConnection.getLatestBlockhash("confirmed");
            tx.recentBlockhash = blockhash;
            tx.partialSign(wallet);
            return tx.serialize();
          }

          throw new Error(`[❌] Unsupported transaction type: ${Object.getPrototypeOf(tx)?.constructor?.name}`);
        } catch (err) {
          console.error(`[❌] Transaction signing failed:`, err);
          throw err;
        }
      },
    },
    suiReceiver,
    suiKeypair,
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
