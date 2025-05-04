import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg }  from "../bridge/wormhole";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { UploadOptions }           from "../types";
import { getWalrusClient }         from "./client";
import { getSDKConfig }            from "../config";
import { transferProtocolFee }     from "../bridge/treasury";

export async function uploadFile(options: UploadOptions): Promise<string> {
  // 0. Ensure SDK is setup
  getSDKConfig();

  const {
    file,
    wallet,
    suiReceiverAddress,
    epochs,
    deletable,
    connection = new Connection("https://api.testnet.solana.com"),
  } = options;

  // 1. Hash & size
  const fileSize = file.size;
  const fileHash = await hashFile(file);

  // 2. Get quote
  const quote = await getStorageQuote({ bytes: fileSize, epochs, deletable });

  // 3. Add 1% protocol fee
  const totalSOL = quote.totalCost * 1.01;

  // 4. Pay the treasury, get leftover
  const { remainingSOL, feePaid } = await transferProtocolFee({
    connection,
    payer: wallet,
    amountSOL: totalSOL,
  });

  // 5. Send the Wormhole message and return the blobId
  const blobId = await createAndSendWormholeMsg({
    fileHash,
    fileSize,
    amountSOL: remainingSOL,
    solanaPubkey: wallet.publicKey as PublicKey,
    suiReceiver: suiReceiverAddress,
  });

  return blobId;
}
