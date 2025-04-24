import { getWalrusClient } from '../walrus/client';
import { StorageQuoteOptions, StorageQuoteBreakdown } from '../types';

// Constants based on Walrus docs
const METADATA_OVERHEAD = 64_000_000; // 64MB of fixed metadata
const ERASURE_CODING_MULTIPLIER = 5; // Encoded blob is ~5x original size
const WAL_COST_PER_BYTE_PER_EPOCH = 0.00000001; // Simulated WAL cost per byte per epoch
const SUI_TRANSACTION_COST = 0.01; // Fixed SUI gas cost (simulated)

export async function getStorageQuote(options: StorageQuoteOptions): Promise<StorageQuoteBreakdown> {
	const { bytes, epochs = 3, deletable = true } = options;

	// Simulate encoded blob size
	const encodedSize = (bytes * ERASURE_CODING_MULTIPLIER) + METADATA_OVERHEAD;

	// Simulated WAL cost based on size and epoch duration
	const walCost = encodedSize * epochs * WAL_COST_PER_BYTE_PER_EPOCH;

	// Simulated SUI transaction cost (constant)
	const suiCost = SUI_TRANSACTION_COST;

	const totalCost = walCost + suiCost;

	return {
		walCost,
		suiCost,
		totalCost,
		encodedSize,
		epochs,
	};
}

export async function hashFile(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	return Buffer.from(hashBuffer).toString('hex');
}
