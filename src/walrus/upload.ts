import { getStorageQuote, hashFile } from "../utils/encoding";
import { createAndSendWormholeMsg } from "../bridge/wormhole";
import { PublicKey } from "@solana/web3.js";
import { UploadOptions } from "../types";

export async function uploadFile(options: UploadOptions): Promise<string> {
    const { file, wallet, suiReceiverAddress } = options; 

    // Get File Size 
    const fileSize = file.size; 
    const fileHash = await hashFile(file); 

    // Get Price Estimate 
    const quote = await getStorageQuote(fileSize); 

    // Apply 1% Protocol Fee 
    const totalSOL = quote * 1.01; 

    // Send Wormhole Message 
    const blobId = await createAndSendWormholeMsg({
        fileHash, 
        fileSize, 
        amountSOL: totalSOL, 
        solanaPubkey: wallet.publicKey, 
        suiReceiver: suiReceiverAddress, 
    }); 

    return blobId;
}