export interface UploadOptions {
    file: File; 
    wallet: { publicKey: PublicKey }; 
    suiReceiverAddress?: string; 
}

export interface WormholePayload {
    fileHash: string; 
    fileSize: number; 
    amountSOL: number; 
    solanaPubkey: PublicKey; 
    suiReceiver?: string;
}