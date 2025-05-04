import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { PublicKey, Connection } from "@solana/web3.js";
import { UploadOptions } from "../types";
import { getWalrusClient } from "./client";
import { getSDKConfig } from "../config";
import { transferProtocolFee } from "../bridge/treasury";
import { isAstrosGasFreeSwapAvailable } from "../swap/astrosUtils";

export async function uploadFile(options: UploadOptions): Promise<string> {
  // 0. Ensure SDK is configured
  getSDKConfig();

  const {
    file,
    wallet,
    suiReceiverAddress,
    epochs,
    deletable,
    connection = new Connection("https://api.testnet.solana.com"),
  } = options;

  // 1. Calculate file hash and size
  const fileSize = file.size;
  const fileHash = await hashFile(file);

  // 2. Get storage quote
  const quote = await getStorageQuote({
    bytes: fileSize,
    epochs,
    deletable,
  });

  const estimatedSOL = quote.totalCost;

  // 3. Check if Astros will sponsor the swap
  const wsSolCoinType = "0x2::sui::SUI"; // Replace with actual WSOL coin type if different
  const walCoinType = "0x...::walrus::WAL"; // Replace with actual WAL token coin type
  const suiReceiver = suiReceiverAddress || "auto-derived-sui-address"; // TODO: derive from Solana wallet

  const gasFree = await isAstrosGasFreeSwapAvailable(
    wsSolCoinType,
    walCoinType,
    (estimatedSOL * 1e9).toFixed(0),
    suiReceiver
  );

  // 4. Adjust protocol fee
  const protocolFeePercent = gasFree ? 0.01 : 0.02;
  const totalSOL = estimatedSOL * (1 + protocolFeePercent);

  // 5. Transfer protocol fee and calculate remaining amount for Wormhole
  const { remainingSOL, feePaid } = await transferProtocolFee({
    connection,
    payer: wallet,
    amountSOL: totalSOL,
  });

  // 6. Send Wormhole message to move SOL → Sui
  const blobId = await createAndSendWormholeMsg({
    fileHash,
    fileSize,
    amountSOL: remainingSOL,
    solanaPubkey: wallet.publicKey as PublicKey,
    suiReceiver,
  });

  return blobId;
}
