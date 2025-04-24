import { PublicKey, Connection } from "@solana/web3.js";

export interface UploadOptions {
	file: File;
	wallet: { publicKey: PublicKey; signTransaction: (tx: any) => Promise<any> };
	suiReceiverAddress?: string;
	epochs?: number;
	deletable?: boolean;
	connection?: Connection;
}

export interface WormholePayload {
    fileHash: string; 
    fileSize: number; 
    amountSOL: number; 
    solanaPubkey: PublicKey; 
    suiReceiver?: string;
}

export interface StorageQuoteOptions {
    bytes: number; 
    epochs?: number; 
    deletable?: boolean;
}

export interface StorageQuoteBreakdown {
    walCost: number; 
    suiCost: number; 
    totalCost: number; 
    encodedSize: number; 
    epochs: number;
}