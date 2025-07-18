import { Transaction } from "@mysten/sui/transactions";
import { getSuiClient } from "../config";
import { WebCryptoSigner } from "@mysten/signers/webcrypto";

const PROTOCOL_TREASURY_ADDRESS = "0x26da57b545b73a4e56405bf4f134473c501259ec3ab027bc3334e2dee780f11b";

export async function transferProtocolFee({
	signer,
	amountSUI,
}: {
	signer: WebCryptoSigner;
	amountSUI: number;
}): Promise<{
	txDigest: string;
}> {
  const client = getSuiClient();
	const tx = new Transaction();

	const sender = (await signer.getPublicKey()).toSuiAddress();
	tx.setSender(sender);

	const feeInMist = Math.floor(amountSUI * 1e9); // 1 SUI = 10^9 MIST
	const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure('u64', feeInMist)]);

	tx.transferObjects([feeCoin], tx.pure('address', PROTOCOL_TREASURY_ADDRESS));

	const res = await client.signAndExecuteTransaction({
		transaction: tx,
		signer,
		options: { showEffects: true },
	});

	return { txDigest: res.digest };
}
