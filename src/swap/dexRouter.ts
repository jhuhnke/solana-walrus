import { Aftermath } from 'aftermath-ts-sdk';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Swap WSOL to WAL using Aftermath Smart Order Router on MAINNET
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
	amount: string; // base units (e.g. 1e9 for 1 SOL)
}): Promise<string> {
	const sender = signer.getPublicKey().toSuiAddress();

	// ✅ Initialize Aftermath SDK and Router
	const afSdk = new Aftermath('MAINNET');
	await afSdk.init();
	const router = afSdk.Router();

	// ✅ Get trade route from WSOL → WAL
	const completeRoute = await router.getCompleteTradeRouteGivenAmountIn({
		coinInType: wsSolCoinType,
		coinOutType: walCoinType,
		coinInAmount: BigInt(amount),
	});

	if (!completeRoute) {
		throw new Error('❌ No viable trade route found');
	}

	// ✅ Build transaction from route
	const tx = await router.getTransactionForCompleteTradeRoute({
		walletAddress: sender,
		completeRoute,
		slippage: 0.01, // 1% slippage
	});

	// ✅ Execute transaction
	const suiClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' });
	const result = await suiClient.signAndExecuteTransaction({
		signer,
		transaction: tx,
		options: { showEffects: true },
	});

	if (result.effects?.status.status !== 'success') {
		throw new Error('❌ Swap transaction failed');
	}

	console.log('✅ Swap succeeded! Transaction digest:', result.digest);
	return result.digest;
}
