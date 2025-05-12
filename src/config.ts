import { WalrusClient } from "@mysten/walrus";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

type WalrusClientOptions = ConstructorParameters<typeof WalrusClient>[0];

export type Network = "testnet" | "mainnet";

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
let suiClient: SuiClient | null = null;
let walrusClient: WalrusClient | null = null;

/**
 * Configure the SDK and initialize clients.
 */
export function configureSDK(config: SDKConfig) {
    // Only configure once
    if (currentConfig) {
        console.warn("[⚠️] SDK is already configured. Skipping reconfiguration.");
        return;
    }

    currentConfig = config;

    if (!config.suiUrl || !config.network) {
        throw new Error("[❌] Missing required SUI URL or network configuration");
    }

    console.log("[🔄] Initializing SuiClient and WalrusClient...");

    suiClient = new SuiClient({
        url: config.suiUrl || getFullnodeUrl(config.network),
        network: config.network,
    });//.$extend(WalrusClient.experimental_asClientExtension());

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

/**
 * Retrieve the current SDK configuration.
 */
export function getSDKConfig(): SDKConfig {
    if (!currentConfig) {
        throw new Error(
            "[Walrus SDK] SDK is not configured. Please call `configureSDK({ ... })` before using any functions."
        );
    }
    return currentConfig;
}

/**
 * Retrieve the Sui client.
 */
export function getSuiClient(): SuiClient {
    if (!suiClient) {
        throw new Error("[❌] Sui client not initialized. Please configure the SDK first.");
    }
    return suiClient;
}

/**
 * Retrieve the Walrus client.
 */
export function getWalrusClient(): WalrusClient {
    if (!walrusClient) {
        throw new Error("[❌] Walrus client not initialized. Please configure the SDK first.");
    }
    return walrusClient;
}

// 🔐 Static treasury address (SOL)
export const PROTOCOL_TREASURY_ADDRESS = "GBMTWhsnLAPxLXcwDoFu45VrzBYuCyGU5eLSavksR1Qc";

/**
 * Optional: provide a helper for default RPC fallback
 */
export function getDefaultSolanaRpc(network: Network): string {
    return network === "mainnet"
        ? "https://api.mainnet-beta.solana.com"
        : "https://api.devnet.solana.com";
}
