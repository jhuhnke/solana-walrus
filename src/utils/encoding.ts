import { getWalrusClient } from "../config";
import { StorageQuoteOptions, StorageQuoteBreakdown } from "../types";
import { createHash } from "crypto";
import fetch from "cross-fetch";

const SUI_TRANSACTION_COST = 0.015;
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3/simple/price";

/**
 * Fetch the WAL → SOL and SUI → SOL conversion rates using CoinGecko.
 */
export async function fetchConversionRates(): Promise<{ walToSol: number, suiToSol: number }> {
    try {
        console.log("[🔄] Fetching WAL → SOL and SUI → SOL conversion rates from CoinGecko...");

        const response = await fetch(`${COINGECKO_API_URL}?ids=walrus-2,sui,solana&vs_currencies=usd`);
        const prices = await response.json();

        const walPrice = prices["walrus-2"]?.usd;
        const suiPrice = prices["sui"]?.usd;
        const solPrice = prices["solana"]?.usd;

        if (!walPrice || !suiPrice || !solPrice) {
            console.log(`[❌] Response from CoinGecko:`, prices);
            throw new Error("[❌] Failed to fetch WAL, SUI, or SOL price from CoinGecko");
        }

        const walToSol = walPrice / solPrice;
        const suiToSol = suiPrice / solPrice;
        console.log(`[✅] WAL → SOL Rate: ${walToSol}, SUI → SOL Rate: ${suiToSol}`);
        return { walToSol, suiToSol };

    } catch (error) {
        console.error("[❌] Failed to fetch WAL and SUI rates:", error);
        throw error;
    }
}

/**
 * Fetch the storage quote for a given file size and epoch duration.
 */
export async function getStorageQuote(options: StorageQuoteOptions): Promise<StorageQuoteBreakdown> {
    try {
        console.log("[💰] Requesting storage quote...");
        console.log(`[📏] Quote Options:`, options);

        const walrusClient = getWalrusClient();

        if (!walrusClient) {
            throw new Error("[❌] Walrus client not initialized");
        }

        const { bytes, epochs } = options;
        if (!epochs || epochs <= 0) {
            throw new Error("[❌] Number of epochs must be greater than 0");
        }

        // ✅ Use the actual byte length and user-supplied epochs
        console.log(`[💰] Fetching quote for ${bytes} bytes over ${epochs} epochs...`);
        const quote = await walrusClient.storageCost(bytes, epochs);
        console.log(`[✅] Raw Quote Response:`, quote);

        // ✅ Convert to WAL directly (without double conversion)
        const storageCostInWAL = Number(quote.storageCost) / 1e9;
        const writeCostInWAL = Number(quote.writeCost) / 1e9;
        const totalCostInWAL = storageCostInWAL + writeCostInWAL;

        console.log(`[✅] Total cost in WAL: ${totalCostInWAL}`);

        return {
            walCost: storageCostInWAL,
            writeCost: writeCostInWAL,
            suiCost: SUI_TRANSACTION_COST, // This is in SUI
            totalCost: totalCostInWAL, // This is in WAL, not SOL
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
