import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { PROTOCOL_TREASURY_ADDRESS } from "../config";

export async function transferProtocolFee({
  signer,
  amountSUI,
}: {
  signer: Ed25519Keypair;
  amountSUI: number;
}): Promise<{
  remainingSUI: number;
  feePaid: number;
  txDigest: string;
}> {
  const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

  const sender = signer.getPublicKey().toSuiAddress();
  const feePercent = 0.01;
  const feeAmount = amountSUI * feePercent;
  const feeInMist = Math.floor(feeAmount * 1e9); // 1 SUI = 1e9 MIST

  const tx = new Transaction();

  // Split a coin from gas
  const [feeCoin] = tx.splitCoins(tx.gas, [feeInMist]);

  // Send to treasury
  tx.transferObjects([feeCoin], PROTOCOL_TREASURY_ADDRESS);
  tx.setSender(sender);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true },
  });

  return {
    remainingSUI: amountSUI - feeAmount,
    feePaid: feeAmount,
    txDigest: result.digest,
  };
}
