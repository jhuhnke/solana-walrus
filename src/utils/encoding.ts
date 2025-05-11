import { WalrusClient } from "@mysten/walrus";
import { StorageQuoteOptions, StorageQuoteBreakdown } from "../types";
import { getWalrusClient } from "../walrus/client";

// SUI Transaction Cost (fixed for simplicity)
const SUI_TRANSACTION_COST = 0.015; // SUI (simulated)

export async function getStorageQuote(options: StorageQuoteOptions): Promise<StorageQuoteBreakdown> {
    const { bytes, epochs = 3, deletable = true } = options;

    // ✅ 1. Fetch the pre-configured Walrus client
    const client = getWalrusClient();

    // ✅ 2. Use the Walrus SDK's built-in method for cost estimation
    const { storageCost, writeCost, totalCost } = await client.storageCost(bytes, epochs);

    // ✅ 3. Return the full breakdown
    return {
        walCost: Number(storageCost),
        writeCost: Number(writeCost),
        suiCost: SUI_TRANSACTION_COST,
        totalCost: Number(totalCost) + SUI_TRANSACTION_COST,
        encodedSize: bytes,
        epochs,
    };
}

export async function hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Buffer.from(hashBuffer).toString("hex");
}
