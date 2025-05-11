// src/utils/encoding.ts

import { WalrusClient } from "@mysten/walrus";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { StorageQuoteOptions, StorageQuoteBreakdown } from "../types";
import { createHash } from "crypto";

// SUI Transaction Cost (fixed for simplicity)
const SUI_TRANSACTION_COST = 0.015;

// ✅ Lazy initialize the clients to avoid context loss
let suiClient: SuiClient;
let walrusClient: WalrusClient;

function initializeClients() {
    if (!suiClient || !walrusClient) {
        console.log("[🔄] Initializing SuiClient and WalrusClient...");

        // ✅ Create Sui Client
        suiClient = new SuiClient({
            url: getFullnodeUrl("testnet"),
            network: "testnet"
        });

        // ✅ Create Walrus Client with Correct Package Config
        walrusClient = new WalrusClient({
            network: "testnet",
            suiClient,
            packageConfig: {
                systemObjectId: "0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af",
                stakingPoolId: "0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3",
            },
            storageNodeClientOptions: {
                onError: (error) => console.error("[❌] Walrus Client Error:", error),
            },
        });

        console.log(`[✅] Sui Client Initialized:`, suiClient);
        console.log(`[✅] Walrus Client Initialized:`, walrusClient);
    }
}

/**
 * Fetch the storage quote for a given file size and epoch duration.
 */
export async function getStorageQuote(options: StorageQuoteOptions): Promise<StorageQuoteBreakdown> {
    try {
        console.log("[💰] Requesting storage quote...");
        console.log(`[📏] Quote Options:`, options);

        // ✅ Ensure clients are initialized
        initializeClients();

        const { bytes, epochs = 3 } = options;

        // ✅ Use actual byte length
        const quote = await walrusClient.storageCost(bytes, epochs);
        console.log(`[✅] Raw Quote Response:`, quote);

        // ✅ Return formatted breakdown
        const breakdown: StorageQuoteBreakdown = {
            walCost: Number(quote.storageCost) / 1e9,
            writeCost: Number(quote.writeCost) / 1e9,
            suiCost: SUI_TRANSACTION_COST,
            totalCost: (Number(quote.totalCost) / 1e9) + SUI_TRANSACTION_COST,
            encodedSize: bytes,
            epochs,
        };

        console.log(`[✅] Final Quote Breakdown:`, breakdown);
        return breakdown;

    } catch (error) {
        console.error("[❌] Failed to get storage quote:", error);
        throw error;
    }
}

/**
 * Generate a SHA-256 hash for the provided file.
 */
export async function hashFile(fileBuffer: Buffer): Promise<string> {
    try {
        const hash = createHash("sha256").update(fileBuffer).digest("hex");
        console.log(`[✅] File Hash: ${hash}`);
        return hash;
    } catch (error) {
        console.error("[❌] Failed to hash file:", error);
        throw error;
    }
}
