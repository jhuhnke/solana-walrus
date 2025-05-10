import { getDefaultSolanaRpc, SDKConfig } from "../config";

import bs58 from "bs58";
import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import {
  VersionedTransaction,
  Connection,
  Keypair,
  Transaction,
} from "@solana/web3.js";
import { UploadOptions } from "../types";
import { getSDKConfig } from "../config";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";
import { finalizeUploadOnSui } from "../walrus/upload";
import { getCachedOrCreateSuiKeypair } from "../wallets/deriveSuiKeypair";

// 🔧 Use your custom RPC for faster blockhash lookups
const CUSTOM_RPC_URL =
  "https://methodical-empty-forest.solana-testnet.quiknode.pro/357c49f3e52f3347f89f3408e368aaaac595c8b9/";

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
  } = options;

  const config = getSDKConfig();

  // 0. Enforce correct wallet type
  if (!(wallet instanceof Keypair)) {
    throw new Error("[Walrus SDK] Expected a Solana Keypair for the payer.");
  }

  // 1. Use or generate Sui keypair
  const suiKeypair =
    userProvidedSuiKeypair || getCachedOrCreateSuiKeypair(wallet.publicKey);

  // 2. Select Solana RPC
  const solanaConnection = connection || getCustomConnection();

  // 3. Get file size + hash
  const fileSize = file.size;
  const fileHash = await hashFile(file);
  const fileBytes = new Uint8Array(await file.arrayBuffer());

  // 4. Get quote from Walrus
  const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });
  const estimatedSOL = quote.totalCost;

  // 5. Get token info and Sui address
  const { wsSol, wal } = config.tokenAddresses[config.network];
  const suiReceiver =
    suiReceiverAddress || suiKeypair.getPublicKey().toSuiAddress();

  // 6. Check Astros gas sponsorship
  const gasFree = await isAstrosGasFreeSwapAvailable(
    wsSol,
    wal,
    (estimatedSOL * 1e9).toFixed(0),
    suiReceiver
  );

  // 7. Apply protocol fee
  const protocolFeePercent = gasFree ? 0.01 : 0.02;
  const totalSOL = estimatedSOL * (1 + protocolFeePercent);

  // 8. Transfer protocol fee to treasury
  const { remainingSOL } = await transferProtocolFee({
    connection: solanaConnection,
    payer: wallet,
    amountSOL: totalSOL,
  });

  // 9. Send Wormhole message from Solana → Sui
  await createAndSendWormholeMsg({
    fileHash,
    fileSize,
    amountSOL: remainingSOL,
    wallet: {
      publicKey: wallet.publicKey,
      signTransaction: async (tx) => {
        try {
          console.log(`[📝] Attempting to sign transaction...`);
          console.log(
            `[🔍] Raw Transaction Type: ${
              Object.getPrototypeOf(tx)?.constructor?.name
            }`
          );

          // Handle SolanaUnsignedTransaction
          if (
            typeof tx === "object" &&
            tx !== null &&
            "transaction" in tx &&
            typeof (tx as any).transaction === "object" &&
            Array.isArray((tx as any).transaction.signers)
          ) {
            console.log(
              `[📝] Detected SolanaUnsignedTransaction, inspecting structure...`
            );

            const {
              transaction: innerTx,
              signers,
            } = (tx as {
              transaction: { transaction: Transaction; signers: Keypair[] };
            }).transaction;

            if (innerTx instanceof Transaction) {
              const { blockhash, lastValidBlockHeight } =
                await solanaConnection.getLatestBlockhash("confirmed");
              if (!blockhash) {
                throw new Error("[❌] Failed to fetch blockhash.");
              }
              innerTx.recentBlockhash = blockhash;

              // Debug logs
              console.log(`[DEBUG] innerTx recentBlockhash:`, innerTx.recentBlockhash);
              console.log(`[DEBUG] innerTx compiled message:`, innerTx.compileMessage().toString());

              innerTx.partialSign(wallet, ...signers);
              console.log(`[✅] Successfully signed unwrapped transaction.`);

              const serialized = innerTx.serialize();
              console.log(
                `[DEBUG] serialized (base58):`,
                bs58.encode(serialized)
              );
              console.log(
                `[✅] Serialized transaction length: ${serialized.length} bytes`
              );
              return serialized;
            } else {
              throw new Error(`[❌] Unsupported inner transaction type.`);
            }
          }

          // Handle Uint8Array
          if (tx instanceof Uint8Array) {
            console.log(`[✅] Received raw Uint8Array, passing through...`);
            console.log(
              `[DEBUG] raw (base58):`,
              bs58.encode(tx)
            );
            return tx;
          }

          // Handle VersionedTransaction
          if (tx instanceof VersionedTransaction) {
            const { blockhash } =
              await solanaConnection.getLatestBlockhash("confirmed");
            if (!blockhash) {
              throw new Error("[❌] Failed to fetch blockhash.");
            }
            tx.message.recentBlockhash = blockhash;

            // Debug logs
            console.log(
              `[DEBUG] versioned message recentBlockhash:`,
              tx.message.recentBlockhash
            );
            console.log(`[DEBUG] versioned message:`, tx.message);

            tx.sign([wallet]);
            const verSer = tx.serialize();
            console.log(
              `[DEBUG] serialized versioned (base58):`,
              bs58.encode(verSer)
            );
            console.log(
              `[✅] Serialized versioned transaction length: ${verSer.length} bytes`
            );
            return verSer;
          }

          // Handle Transaction
          if (tx instanceof Transaction) {
            const { blockhash } =
              await solanaConnection.getLatestBlockhash("confirmed");
            if (!blockhash) {
              throw new Error("[❌] Failed to fetch blockhash.");
            }
            tx.recentBlockhash = blockhash;

            // Debug logs
            console.log(`[DEBUG] legacyTx recentBlockhash:`, tx.recentBlockhash);
            console.log(
              `[DEBUG] legacyTx compiled message:`,
              tx.compileMessage().toString()
            );

            tx.partialSign(wallet);
            console.log(`[✅] Successfully signed legacy transaction.`);

            const legSer = tx.serialize();
            console.log(
              `[DEBUG] serialized legacy (base58):`,
              bs58.encode(legSer)
            );
            console.log(
              `[✅] Serialized transaction length: ${legSer.length} bytes`
            );
            return legSer;
          }

          // Unsupported
          throw new Error(
            `[❌] Unsupported tx type: ${
              Object.getPrototypeOf(tx)?.constructor?.name
            }`
          );
        } catch (err) {
          console.error(`[❌] Transaction signing failed:`, (err as Error).message);
          throw err;
        }
      },
    },
    suiReceiver,
    suiKeypair,
  });

  // 10. Upload blob on Sui
  const result = await finalizeUploadOnSui({
    suiKeypair,
    fileBytes,
    epochs,
    deletable,
  });

  // 11. Return blob ID
  return result.blobId;
}
