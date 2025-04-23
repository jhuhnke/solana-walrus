import { WalrusClientOptions } from '@mysten/walrus'; 

export interface SDKConfig {
    network: 'testnet' | 'mainnet' | "devnet" | "localnet"; 
    suiUrl?: string; 
    walrusOptions?: Partial<WalrusClientOptions>; 
}

let currentConfig: SDKConfig = { 
    network: 'testnet', 
}; 

export function configureSDK(config: SDKConfig) {
    currentConfig = config; 
}

export function getSDKConfig(): SDKConfig {
    return currentConfig; 
}