import { getWalrusClient, getSuiClient } from "../config";
import { StorageQuoteOptions, StorageQuoteBreakdown } from "../types";
import { createHash } from "crypto";

const SUI_TRANSACTION_COST = 0.015;

/**
 * Fetch the storage quote for a given file size and epoch duration.
 */
export async function getStorageQuote(options: StorageQuoteOptions): Promise<StorageQuoteBreakdown> {
    try {
        console.log("[💰] Requesting storage quote...");
        console.log(`[📏] Quote Options:`, options);

        const walrusClient = getWalrusClient();
        const suiClient = getSuiClient();

        if (!walrusClient) {
            throw new Error("[❌] Walrus client not initialized");
        }

        const { bytes, epochs = 3 } = options;

        // ✅ Use the actual byte length and user-supplied epochs
        console.log(`[💰] Fetching quote for ${bytes} bytes over ${epochs} epochs...`);
        const quote = await walrusClient.storageCost(bytes, epochs);
        console.log(`[✅] Raw Quote Response:`, quote);

        return {
            walCost: Number(quote.storageCost) / 1e9,
            writeCost: Number(quote.writeCost) / 1e9,
            suiCost: SUI_TRANSACTION_COST,
            totalCost: (Number(quote.totalCost) / 1e9) + SUI_TRANSACTION_COST,
            encodedSize: bytes,
            epochs,
        };

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
