import { initializeClients } from "../walrus/client";
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

        const { walrusClient } = initializeClients();

        const { bytes, epochs = 3 } = options;

        // ✅ Use actual byte length
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
