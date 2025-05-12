// src/walrus/client.ts

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";
import { getSDKConfig } from "../config";

let suiClient: SuiClient | null = null;
let walrusClient: WalrusClient | null = null;

export function initializeClients() {
    if (!suiClient || !walrusClient) {
        console.log("[🔄] Initializing SuiClient and WalrusClient...");

        const config = getSDKConfig();

        if (!config.suiUrl || !config.network) {
            throw new Error("[❌] Missing required SUI URL or network configuration");
        }

        suiClient = new SuiClient({
            url: config.suiUrl || getFullnodeUrl(config.network),
            network: config.network,
        });

        walrusClient = new WalrusClient({
            network: config.network,
            suiClient,
            packageConfig: {
                systemObjectId: "0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af",
                stakingPoolId: "0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3",
            },
        });

        console.log(`[✅] Sui Client Initialized for ${config.network}:`, suiClient);
        console.log(`[✅] Walrus Client Initialized for ${config.network}:`, walrusClient);
    }

    if (!suiClient || !walrusClient) {
        throw new Error("[❌] Failed to initialize SuiClient or WalrusClient");
    }

    return { suiClient, walrusClient };
}

// ✅ Export the already-initialized clients
export { suiClient, walrusClient };
