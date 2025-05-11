import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";
import { getSDKConfig } from "../config";

let walrusClient: WalrusClient | null = null;

export function getWalrusClient(): WalrusClient {
    if (walrusClient) return walrusClient;

    const config = getSDKConfig();
    const suiUrl = config.suiUrl || getFullnodeUrl(config.network);

    // 🌐 Correct SuiClient initialization
    console.log(`[🌐] Initializing Sui Client with URL: ${suiUrl}`);
    const suiClient = new SuiClient({
        url: suiUrl,
        network: 'testnet'
    });

    // ✅ Additional Debug Logging
    console.log(`[✅] Sui Client Initialized:`, suiClient);
    console.log(`[⚙️] Sui Client Network:`, suiUrl);

    // 🚀 Initialize the WalrusClient
    const { suiRpcUrl, ...safeWalrusOptions } = config.walrusOptions || {};
    walrusClient = new WalrusClient({
        network: config.network,
        suiClient,  // Attach the SuiClient here
        ...safeWalrusOptions,
    });

    // ✅ Final Verification
    console.log(`[✅] Walrus Client Initialized:`, walrusClient);
    console.log(`[⚙️] Walrus Client Properties:`, Object.keys(walrusClient));

    return walrusClient;
}
