import { WalrusClientOptions } from '@mysten/walrus'; 

export interface SDKConfig {
    network: 'testnet' | 'mainnet' | "devnet" | "localnet"; 
    suiUrl?: string; 
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

export const PROTOCOL_TREASURY_ADDRESS='';