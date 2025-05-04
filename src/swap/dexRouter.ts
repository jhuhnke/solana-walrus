import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const ASTROS_API = 'https://aggregator.astroswap.org/route';

/**
 * Swap WSOL to WAL using Astros Aggregator
 */
export async function swapWSOLtoWAL({
	signer,
	wsSolCoinType,
	walCoinType,
	amount,
}: {
	signer: Ed25519Keypair;
	wsSolCoinType: string;
	walCoinType: string;
	amount: string; // in base units, e.g. lamports (1e9 = 1 SOL)
}): Promise<string> {
	const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
	const sender = signer.getPublicKey().toSuiAddress();

	// 1. Call Astros Aggregator API to get swap route
	const url = `${ASTROS_API}?fromCoinType=${wsSolCoinType}&toCoinType=${walCoinType}&amount=${amount}&sender=${sender}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error('Astros API call failed');
	const routeData = await res.json();

	// 2. Deserialize transaction block from aggregator response
	const txBytes = new Uint8Array(routeData.txBytes.data);
	const tx = Transaction.from(txBytes);

	// 3. Sign and execute the swap transaction
	const result = await suiClient.signAndExecuteTransaction({
		transaction: tx,
		signer,
		options: {
			showEffects: true,
		},
	});

	if (result.effects?.status.status !== 'success') {
		throw new Error('Swap failed on Sui');
	}

	console.log('✅ Swap succeeded! Transaction digest:', result.digest);
	return result.digest;
}
