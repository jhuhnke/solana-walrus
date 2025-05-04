import { WalrusClient } from '@mysten/walrus';

type WalrusClientOptions = ConstructorParameters<typeof WalrusClient>[0];

export type Network = 'testnet' | 'mainnet';

export interface TokenAddresses {
	wsSol: string; 
	wal: string;   
}

export interface SDKConfig {
	network: Network;
	suiUrl?: string;
	solanaRpcUrl?: string;
	tokenAddresses: Record<Network, TokenAddresses>;
	walrusOptions?: Partial<WalrusClientOptions>;
}

let currentConfig: SDKConfig | null = null;

export function configureSDK(config: SDKConfig) {
	currentConfig = config;
}

export function getSDKConfig(): SDKConfig {
	if (!currentConfig) {
		throw new Error(
			'[Walrus SDK] SDK is not configured. Please call `configureSDK({ ... })` before using any functions.',
		);
	}
	return currentConfig;
}

// 🔐 Static treasury address (SOL)
export const PROTOCOL_TREASURY_ADDRESS = 'GBMTWhsnLAPxLXcwDoFu45VrzBYuCyGU5eLSavksR1Qc';

// 🔁 Optional: provide a helper for default RPC fallback
export function getDefaultSolanaRpc(network: Network): string {
	return network === 'mainnet'
		? 'https://api.mainnet-beta.solana.com'
		: 'https://api.testnet.solana.com';
}
