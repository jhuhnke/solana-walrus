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

const WALRUS_PACKAGE_CONFIGS = {
	testnet: {
		systemObjectId: "0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af",
		stakingPoolId: "0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3",
	},
	mainnet: {
		systemObjectId: "0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2",
		stakingPoolId: "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904",
	},
};

/**
 * Configure the SDK and initialize clients.
 */
export function configureSDK(config: SDKConfig) {
	if (currentConfig) {
		console.warn("[⚠️] SDK is already configured. Skipping reconfiguration.");
		return;
	}

	if (!config.suiUrl || !config.network) {
		throw new Error("[❌] Missing required SUI URL or network configuration");
	}

	currentConfig = config;
	console.log("[🔄] Configuring SDK...");
	initializeClients(config);
}

/**
 * Initialize SuiClient and WalrusClient
 */
function initializeClients(config: SDKConfig) {
	if (!suiClient || !walrusClient) {
		console.log("[🔄] Initializing SuiClient and WalrusClient...");

		suiClient = new SuiClient({
			url: config.suiUrl || getFullnodeUrl(config.network),
			network: config.network,
		});

		const packageConfig = WALRUS_PACKAGE_CONFIGS[config.network];

		walrusClient = new WalrusClient({
			network: config.network,
			suiClient,
			packageConfig,
		});

		console.log(`[✅] Sui Client Initialized for ${config.network}:`, suiClient);
		console.log(`[✅] Walrus Client Initialized for ${config.network}:`, walrusClient);
	}
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
		throw new Error("[❌] SuiClient not initialized. Please configure the SDK first.");
	}
	return suiClient;
}

/**
 * Retrieve the Walrus client.
 */
export function getWalrusClient(): WalrusClient {
	if (!walrusClient) {
		throw new Error("[❌] WalrusClient not initialized. Please configure the SDK first.");
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
