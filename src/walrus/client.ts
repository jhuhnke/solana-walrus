import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';
import { getSDKConfig } from '../config';

let walrusClient: WalrusClient | null = null;

export function getWalrusClient(): WalrusClient {
    if (walrusClient) return walrusClient;

    const config = getSDKConfig();
    const suiUrl = config.suiUrl || getFullnodeUrl(config.network);

    // 🌐 Correct SuiClient initialization
    console.log(`[🌐] Initializing Sui Client with URL: ${suiUrl}`);
    
    const suiClient = new SuiClient({ url: suiUrl });

    console.log(`[✅] Sui Client Initialized:`, suiClient);

    const { suiRpcUrl, ...safeWalrusOptions } = config.walrusOptions || {};

    // 🚀 Initialize the WalrusClient
    walrusClient = new WalrusClient({
        network: config.network,
        suiClient,
        ...safeWalrusOptions,
    });

    console.log(`[✅] Walrus Client Initialized:`, walrusClient);

    return walrusClient;
}
