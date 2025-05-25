import { Aftermath } from "aftermath-ts-sdk";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/**
 * Swap WSOL to WAL using Aftermath Smart Order Router on MAINNET.
 * Aftermath SDK automatically handles coin selection, merging, and transfer.
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
	amount: string;
}): Promise<string> {
	const sender = signer.getPublicKey().toSuiAddress();
	console.log(`[🔑] Sender: ${sender}`);
	console.log(`[🔄] Swapping exactly ${amount} WSOL → WAL`);

	try {
		const suiClient = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" });

		const sdk = new Aftermath("MAINNET");
		await sdk.init();
		const router = sdk.Router();

		// ✅ Get route
		const route = await router.getCompleteTradeRouteGivenAmountIn({
			coinInType: wsSolCoinType,
			coinOutType: walCoinType,
			coinInAmount: BigInt(amount),
		});
		if (!route) throw new Error("No viable trade route found");

		// ✅ Let Aftermath build full transaction (including coin selection)
		const tx = await router.getTransactionForCompleteTradeRoute({
			walletAddress: sender,
			completeRoute: route,
			slippage: 0.02,
		});

		// ✅ Execute
		const result = await suiClient.signAndExecuteTransaction({
			signer,
			transaction: tx,
			options: { showEffects: true, showInput: true },
		});

		if (result.effects?.status.status !== "success") {
			console.error("[❌] Swap failed:", result.effects?.status);
			throw new Error("Swap transaction failed");
		}

		console.log(`[✅] Swap succeeded! TX digest: ${result.digest}`);
		return result.digest;

	} catch (err: any) {
		const msg = err?.message || err?.toString();
		console.error("[❌] Error during swapWSOLtoWAL:", msg);
		throw new Error(`Swap failed: ${msg}`);
	}
}
