import { PublicKey, Connection, Transaction, Keypair } from "@solana/web3.js";
import type { Ed25519Keypair as SuiKeypair } from "@mysten/sui/keypairs/ed25519";

export interface UploadOptions {
  file: String;
  wallet: Keypair | {
      publicKey: PublicKey;
      signTransaction: (tx: Transaction) => Promise<Transaction>;
  };
  suiReceiverAddress?: string;
  suiKeypair?: SuiKeypair;
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
    writeCost: number;
    suiCost: number;
    totalCost: number;
    encodedSize: number;
    epochs: number;
}
