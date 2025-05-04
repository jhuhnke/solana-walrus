import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';
import { getSDKConfig } from '../config';

let walrusClient: WalrusClient | null = null;

export function getWalrusClient(): WalrusClient {
	if (walrusClient) return walrusClient;

	const config = getSDKConfig();

	const suiClient = new SuiClient({
		url: config.suiUrl || getFullnodeUrl(config.network),
	});

	const { suiRpcUrl, ...safeWalrusOptions } = config.walrusOptions || {};

	walrusClient = new WalrusClient({
		network: config.network,
		suiClient,
		...safeWalrusOptions,
	});

	return walrusClient;
}
